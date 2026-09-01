import json
import logging
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiomysql
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

try:
    from .companion_service import build_learning_context, call_deepseek, generate_progress_analysis, summarize_session
    from .gaze_analysis import classify_threshold, extract_features
    from .mchat_analysis import analyze_mchat
except ImportError:
    from companion_service import build_learning_context, call_deepseek, generate_progress_analysis, summarize_session
    from gaze_analysis import classify_threshold, extract_features
    from mchat_analysis import analyze_mchat

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "autigaze")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 30
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer(auto_error=True)
pool: Optional[aiomysql.Pool] = None


def database_identifier(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise RuntimeError("MYSQL_DATABASE hanya boleh berisi huruf, angka, dan underscore")
    return f"`{name}`"


async def initialize_database() -> None:
    global pool
    connection = await aiomysql.connect(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER,
        password=MYSQL_PASSWORD, autocommit=True,
    )
    try:
        async with connection.cursor() as cursor:
            await cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {database_identifier(MYSQL_DATABASE)} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()

    pool = await aiomysql.create_pool(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER,
        password=MYSQL_PASSWORD, db=MYSQL_DATABASE, autocommit=True,
        minsize=1, maxsize=10,
    )
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id CHAR(36) NOT NULL PRIMARY KEY,
                    name VARCHAR(120) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
                    child JSON NOT NULL,
                    autism_test JSON NULL,
                    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                ) ENGINE=InnoDB
                """
            )
            await cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS status_checks (
                    id CHAR(36) NOT NULL PRIMARY KEY,
                    client_name VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP(6) NOT NULL
                ) ENGINE=InnoDB
                """
            )
            await cursor.execute("SHOW COLUMNS FROM users LIKE 'role'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') "
                    "NOT NULL DEFAULT 'user' AFTER password_hash"
                )
            schema_sql = (ROOT_DIR / "database.sql").read_text(encoding="utf-8")
            schema_statements = [statement.strip() for statement in schema_sql.split(";")]
            for statement in schema_statements:
                if not statement or statement.upper().startswith(("CREATE DATABASE", "USE ", "INSERT ", "UPDATE ", "DELETE ")):
                    continue
                await cursor.execute(statement)

            await cursor.execute("SHOW COLUMNS FROM lessons LIKE 'content_type'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE lessons ADD COLUMN content_type ENUM('vrm', 'image', 'video', 'article') "
                    "NOT NULL DEFAULT 'vrm' AFTER show_body_estimation"
                )
            await cursor.execute("SHOW COLUMNS FROM lessons LIKE 'media_url'")
            if not await cursor.fetchone():
                await cursor.execute("ALTER TABLE lessons ADD COLUMN media_url TEXT NULL AFTER content_type")
            await cursor.execute("SHOW COLUMNS FROM lessons LIKE 'material_text'")
            if not await cursor.fetchone():
                await cursor.execute("ALTER TABLE lessons ADD COLUMN material_text TEXT NULL AFTER media_url")
            await cursor.execute("SHOW COLUMNS FROM lessons LIKE 'content_type'")
            content_type_column = await cursor.fetchone()
            if content_type_column and "visual_novel" not in content_type_column[1]:
                await cursor.execute(
                    "ALTER TABLE lessons MODIFY content_type "
                    "ENUM('vrm', 'image', 'video', 'article', 'visual_novel') NOT NULL DEFAULT 'vrm'"
                )
            await cursor.execute("SHOW COLUMNS FROM chapters LIKE 'course_id'")
            if not await cursor.fetchone():
                await cursor.execute("ALTER TABLE chapters ADD COLUMN course_id VARCHAR(80) NULL AFTER id")

            for statement in schema_statements:
                statement = statement.strip()
                if not statement or not statement.upper().startswith(("INSERT ", "UPDATE ", "DELETE ")):
                    continue
                await cursor.execute(statement)
            await cursor.execute("SHOW COLUMNS FROM screening_sessions LIKE 'gaze_data'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE screening_sessions ADD COLUMN gaze_data JSON NULL AFTER result"
                )
            await cursor.execute("SHOW COLUMNS FROM screening_sessions LIKE 'analysis'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE screening_sessions ADD COLUMN analysis JSON NULL AFTER gaze_data"
                )
            await cursor.execute("SHOW COLUMNS FROM companion_conversations LIKE 'audience'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE companion_conversations ADD COLUMN audience ENUM('child', 'parent') "
                    "NOT NULL DEFAULT 'child' AFTER user_id"
                )
            await cursor.execute("SHOW COLUMNS FROM lesson_progress LIKE 'score'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE lesson_progress ADD COLUMN score DECIMAL(5,2) NULL AFTER focus_score"
                )
            await cursor.execute("SHOW COLUMNS FROM lesson_progress LIKE 'duration_seconds'")
            if not await cursor.fetchone():
                await cursor.execute(
                    "ALTER TABLE lesson_progress ADD COLUMN duration_seconds INT NULL AFTER score"
                )


@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialize_database()
    yield
    if pool:
        pool.close()
        await pool.wait_closed()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ChildDataInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    fullName: Optional[str] = None
    nickname: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    bloodType: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    parentName: Optional[str] = None
    parentContact: Optional[str] = None
    address: Optional[str] = None
    hobbies: Optional[List[str]] = None


class AutismTestInput(BaseModel):
    done: bool
    diagnosis: Optional[str] = None
    method: Optional[str] = None
    result: Optional[str] = None
    score: Optional[int] = None


class QuizAnswerInput(BaseModel):
    question_id: str
    answer: Optional[str] = None


class QuizAttemptInput(BaseModel):
    answers: List[QuizAnswerInput]


class LessonProgressInput(BaseModel):
    status: str = "completed"
    # focus_score/score/duration are always computed server-side from focus_events
    # when status="completed" (see update_lesson_progress), so no client input is needed here.

class FocusEventInput(BaseModel):
    occurred_at: Optional[datetime] = None


class CompanionMessageInput(BaseModel):
    message: str
    audience: str = "child"
    conversationId: Optional[str] = None


class CompanionSettingsInput(BaseModel):
    persona: str = "netral"
    topicRestrictions: Optional[str] = None


class ScreeningSessionInput(BaseModel):
    definition_id: str
    answers: Dict[str, Any] = Field(default_factory=dict)
    score: Optional[int] = None
    result: Optional[str] = None
    gaze_session: Optional[Dict[str, Any]] = None


class CourseInput(BaseModel):
    title: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_published: bool = True


class NewsInput(BaseModel):
    title: str
    tag: str
    source: str
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    is_published: bool = True


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user_id, "exp": now + timedelta(days=JWT_EXPIRE_DAYS), "iat": now},
        JWT_SECRET, algorithm=JWT_ALG,
    )


def decode_json(value: Any) -> Any:
    return json.loads(value) if isinstance(value, str) else value


def public_user(row: Dict[str, Any]) -> Dict[str, Any]:
    child = decode_json(row.get("child")) or {}
    profile_mapping = {
        "fullName": row.get("full_name"),
        "nickname": row.get("nickname"),
        "age": row.get("age"),
        "dob": row.get("dob").isoformat() if hasattr(row.get("dob"), "isoformat") else row.get("dob"),
        "gender": row.get("gender"),
        "bloodType": row.get("blood_type"),
        "diagnosis": row.get("diagnosis"),
        "diagnosisDate": row.get("diagnosis_date"),
        "school": row.get("school"),
        "grade": row.get("grade"),
        "therapist": row.get("therapist"),
        "hobbies": decode_json(row.get("hobbies")),
        "parentName": row.get("parent_name"),
        "parentContact": row.get("parent_contact"),
        "address": row.get("address"),
        "email": row.get("email"),
    }
    child.update({key: value for key, value in profile_mapping.items() if value is not None})
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row.get("role", "user"),
        "child": child,
        "autismTest": decode_json(row.get("autism_test")),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


async def find_user_by_id(user_id: str, include_password: bool = False):
    columns = "u.*" if include_password else "u.id, u.name, u.email, u.role, u.child, u.autism_test, u.created_at"
    profile_columns = "cp.full_name, cp.nickname, cp.age, cp.dob, cp.gender, cp.blood_type, " \
        "cp.diagnosis, cp.diagnosis_date, cp.school, cp.grade, cp.therapist, cp.hobbies, " \
        "cp.parent_name, cp.parent_contact, cp.address"
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                f"SELECT {columns}, {profile_columns} FROM users u "
                "LEFT JOIN child_profiles cp ON cp.user_id = u.id WHERE u.id = %s",
                (user_id,),
            )
            return await cursor.fetchone()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    return public_user(user)


async def get_admin_user(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses admin diperlukan")
    return user


@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status = StatusCheck(client_name=input.client_name)
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO status_checks (id, client_name, timestamp) VALUES (%s, %s, %s)",
                (status.id, status.client_name, status.timestamp),
            )
    return status


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, client_name, timestamp FROM status_checks "
                "ORDER BY timestamp DESC LIMIT 1000"
            )
            return await cursor.fetchall()


@api_router.get("/categories")
async def get_categories():
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                SELECT c.id, c.title, c.color, c.description,
                       COALESCE(JSON_ARRAYAGG(m.course_id), JSON_ARRAY()) AS course_ids
                FROM course_categories c
                LEFT JOIN course_category_map m ON m.category_id = c.id
                WHERE c.is_published = TRUE
                GROUP BY c.id, c.title, c.color, c.description, c.sort_order
                ORDER BY c.sort_order, c.title
                """
            )
            categories = await cursor.fetchall()
    for category in categories:
        category["courseIds"] = decode_json(category.pop("course_ids")) or []
    return categories


@api_router.get("/courses")
async def get_courses(category_id: Optional[str] = None):
    query = """
        SELECT DISTINCT c.id, c.title, c.image_url AS image, c.description,
               c.sort_order
        FROM courses c
        LEFT JOIN course_category_map m ON m.course_id = c.id
        WHERE c.is_published = TRUE
    """
    params: List[Any] = []
    if category_id:
        query += " AND m.category_id = %s"
        params.append(category_id)
    query += " ORDER BY c.sort_order, c.title"
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(query, params)
            return await cursor.fetchall()


@api_router.get("/courses/{course_id}/chapters")
async def get_course_chapters(course_id: str):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                SELECT ch.id, ch.title, ch.sort_order,
                       COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
                         'id', l.id, 'name', l.name, 'stageTitle', l.stage_title,
                         'speech', l.speech, 'description', l.description,
                         'showBodyEstimation', l.show_body_estimation,
                                                 'contentType', l.content_type, 'mediaUrl', l.media_url,
                                                     'materialText', l.material_text,
                         'sortOrder', l.sort_order
                       )), JSON_ARRAY()) AS modules
                FROM chapters ch
                JOIN lessons l ON l.chapter_id = ch.id
                JOIN courses c ON c.id = %s AND ch.course_id = c.id
                GROUP BY ch.id, ch.title, ch.sort_order
                ORDER BY ch.sort_order
                """,
                (course_id,),
            )
            chapters = await cursor.fetchall()
    for chapter in chapters:
        chapter["modules"] = decode_json(chapter.pop("modules")) or []
        chapter["modules"].sort(key=lambda module: module.get("sortOrder", 0))
    if not chapters:
        raise HTTPException(status_code=404, detail="Course atau chapter tidak ditemukan")
    return chapters


@api_router.get("/news")
async def get_news():
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                SELECT id, title, tag, source, source_url AS sourceUrl,
                       image_url AS image, excerpt, content, published_at AS publishedAt
                FROM news_articles
                WHERE is_published = TRUE
                ORDER BY published_at DESC, id
                """
            )
            return await cursor.fetchall()


@api_router.get("/screening/definitions")
async def get_screening_definitions():
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                SELECT d.id, d.method, d.title, d.description, d.video_id AS videoId,
                       d.version,
                       COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
                         'id', q.id, 'text', q.question_text, 'risk', q.risk_answer
                       )), JSON_ARRAY()) AS questions
                FROM screening_definitions d
                LEFT JOIN screening_questions q ON q.definition_id = d.id
                WHERE d.is_published = TRUE
                GROUP BY d.id, d.method, d.title, d.description, d.video_id, d.version
                ORDER BY d.method
                """
            )
            definitions = await cursor.fetchall()
    for definition in definitions:
        definition["questions"] = decode_json(definition.pop("questions")) or []
    return definitions


@api_router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, title, quiz_type AS type FROM quizzes "
                "WHERE id = %s AND is_published = TRUE",
                (quiz_id,),
            )
            quiz = await cursor.fetchone()
            if not quiz:
                raise HTTPException(status_code=404, detail="Quiz tidak ditemukan")
            await cursor.execute(
                "SELECT id, prompt, question_text AS question, options "
                "FROM quiz_questions WHERE quiz_id = %s ORDER BY sort_order",
                (quiz_id,),
            )
            quiz["questions"] = await cursor.fetchall()
    for question in quiz["questions"]:
        question["options"] = decode_json(question["options"]) or []
    return quiz


@api_router.post("/quizzes/{quiz_id}/attempts")
async def submit_quiz_attempt(
    quiz_id: str,
    payload: QuizAttemptInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    attempt_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, answer_key FROM quiz_questions WHERE quiz_id = %s ORDER BY sort_order",
                (quiz_id,),
            )
            questions = await cursor.fetchall()
            if not questions:
                raise HTTPException(status_code=404, detail="Quiz tidak ditemukan")

            submitted = {answer.question_id: answer.answer for answer in payload.answers}
            scored_answers = [
                (question["id"], submitted.get(question["id"]), submitted.get(question["id"]) == question["answer_key"])
                for question in questions
            ]
            score = sum(is_correct for _, _, is_correct in scored_answers)
            await cursor.execute(
                "INSERT INTO quiz_attempts (id, user_id, quiz_id, score, total) VALUES (%s, %s, %s, %s, %s)",
                (attempt_id, user["id"], quiz_id, score, len(questions)),
            )
            await cursor.executemany(
                "INSERT INTO quiz_answers (attempt_id, question_id, answer, is_correct) VALUES (%s, %s, %s, %s)",
                [(attempt_id, question_id, answer, is_correct) for question_id, answer, is_correct in scored_answers],
            )
            await cursor.execute(
                "INSERT INTO daily_activity (user_id, activity_date, minutes) VALUES (%s, CURRENT_DATE, 1) "
                "ON DUPLICATE KEY UPDATE minutes = minutes + 1",
                (user["id"],),
            )
    return {"attemptId": attempt_id, "score": score, "total": len(questions)}


@api_router.post("/lessons/{lesson_id}/progress")
async def update_lesson_progress(
    lesson_id: str,
    payload: LessonProgressInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    if payload.status not in {"started", "completed"}:
        raise HTTPException(status_code=422, detail="Status lesson tidak valid")
    progress_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT status, started_at FROM lesson_progress WHERE user_id = %s AND lesson_id = %s",
                (user["id"], lesson_id),
            )
            previous_progress = await cursor.fetchone()

            focus_score = None
            score = None
            duration_seconds = None
            if payload.status == "completed":
                # Computed automatically when the "next module" button fires this call, so
                # nilai/fokus/durasi are always available to the AI Companion and AI analysis.
                started_at = previous_progress["started_at"] if previous_progress else None
                await cursor.execute(
                    "SELECT COUNT(*) AS focusLosses, TIMESTAMPDIFF(SECOND, %s, CURRENT_TIMESTAMP(6)) AS durationSeconds "
                    "FROM focus_events WHERE user_id = %s AND lesson_id = %s AND occurred_at >= %s",
                    (started_at, user["id"], lesson_id, started_at or datetime.now(timezone.utc)),
                )
                session_stats = await cursor.fetchone()
                focus_losses = session_stats["focusLosses"] or 0
                duration_seconds = session_stats["durationSeconds"]
                focus_score = max(0, 100 - focus_losses * 10)
                score = max(50, 100 - focus_losses * 5)

            await cursor.execute(
                """
                INSERT INTO lesson_progress (id, user_id, lesson_id, status, focus_score, score, duration_seconds, completed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, IF(%s = 'completed', CURRENT_TIMESTAMP(6), NULL))
                ON DUPLICATE KEY UPDATE status = IF(status = 'completed', 'completed', VALUES(status)),
                    focus_score = IF(VALUES(status) = 'completed', VALUES(focus_score), focus_score),
                    score = IF(VALUES(status) = 'completed', VALUES(score), score),
                    duration_seconds = IF(VALUES(status) = 'completed', VALUES(duration_seconds), duration_seconds),
                    completed_at = IF(VALUES(status) = 'completed', CURRENT_TIMESTAMP(6), completed_at)
                """,
                (
                    progress_id, user["id"], lesson_id, payload.status,
                    focus_score, score, duration_seconds, payload.status,
                ),
            )
            if payload.status == "completed" and (not previous_progress or previous_progress["status"] != "completed"):
                await cursor.execute(
                    "INSERT INTO daily_activity (user_id, activity_date, minutes) VALUES (%s, CURRENT_DATE, 1) "
                    "ON DUPLICATE KEY UPDATE minutes = minutes + 1",
                    (user["id"],),
                )
            if payload.status == "completed":
                await cursor.execute(
                    "INSERT INTO lesson_completion_events (id, user_id, lesson_id) VALUES (%s, %s, %s)",
                    (str(uuid.uuid4()), user["id"], lesson_id),
                )
    return {
        "lessonId": lesson_id,
        "status": payload.status,
        "focusScore": focus_score,
        "score": score,
        "durationSeconds": duration_seconds,
    }

@api_router.post("/lessons/{lesson_id}/focus-events")
async def record_focus_event(
    lesson_id: str,
    payload: FocusEventInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO focus_events (id, user_id, lesson_id, occurred_at) VALUES (%s, %s, %s, %s)",
                (str(uuid.uuid4()), user["id"], lesson_id, payload.occurred_at or datetime.now(timezone.utc)),
            )
    return {"lessonId": lesson_id, "recorded": True}


async def get_or_create_companion_conversation(user_id: str, audience: str) -> str:
    """Reuses the single ongoing conversation for `audience` (used by the parent widget,
    which is never asked to start a fresh session on every page load)."""
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id FROM companion_conversations WHERE user_id = %s AND audience = %s "
                "ORDER BY created_at LIMIT 1",
                (user_id, audience),
            )
            existing = await cursor.fetchone()
            if existing:
                return existing["id"]
            conversation_id = str(uuid.uuid4())
            await cursor.execute(
                "INSERT INTO companion_conversations (id, user_id, audience) VALUES (%s, %s, %s)",
                (conversation_id, user_id, audience),
            )
            return conversation_id


async def create_companion_conversation(user_id: str, audience: str) -> str:
    """Always creates a brand-new conversation row (used for the child page's per-visit sessions)."""
    conversation_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO companion_conversations (id, user_id, audience) VALUES (%s, %s, %s)",
                (conversation_id, user_id, audience),
            )
    return conversation_id


async def get_owned_conversation_id(user_id: str, conversation_id: str, audience: str) -> Optional[str]:
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id FROM companion_conversations WHERE id = %s AND user_id = %s AND audience = %s",
                (conversation_id, user_id, audience),
            )
            row = await cursor.fetchone()
    return row["id"] if row else None


@api_router.post("/companion/session/start")
async def start_companion_session(user: Dict[str, Any] = Depends(get_current_user)):
    """Called on every mount/refresh of the child AI Companion page to start a fresh session,
    keeping the child's chat history separate from the parent widget's ongoing conversation."""
    conversation_id = await create_companion_conversation(user["id"], "child")
    return {"conversationId": conversation_id}


@api_router.get("/companion/history")
async def get_companion_history(user: Dict[str, Any] = Depends(get_current_user)):
    conversation_id = await get_or_create_companion_conversation(user["id"], "parent")
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, role, content, created_at AS createdAt FROM companion_messages "
                "WHERE conversation_id = %s ORDER BY created_at",
                (conversation_id,),
            )
            messages = await cursor.fetchall()
    for message in messages:
        message["createdAt"] = message["createdAt"].isoformat() if message["createdAt"] else None
    return {"conversationId": conversation_id, "messages": messages}


@api_router.post("/companion/chat")
async def send_companion_message(
    payload: CompanionMessageInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Pesan tidak boleh kosong")
    audience = payload.audience if payload.audience in {"child", "parent"} else "child"

    conversation_id = None
    if payload.conversationId:
        conversation_id = await get_owned_conversation_id(user["id"], payload.conversationId, audience)
        if not conversation_id:
            raise HTTPException(status_code=404, detail="Sesi percakapan tidak ditemukan")
    if not conversation_id:
        conversation_id = await get_or_create_companion_conversation(user["id"], audience)

    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "INSERT INTO companion_messages (id, conversation_id, role, content) VALUES (%s, %s, 'user', %s)",
                (str(uuid.uuid4()), conversation_id, message),
            )
            await cursor.execute(
                "SELECT role, content FROM companion_messages WHERE conversation_id = %s "
                "ORDER BY created_at DESC LIMIT 20",
                (conversation_id,),
            )
            history = list(reversed(await cursor.fetchall()))

    context = await build_learning_context(pool, user["id"])
    persona = "netral"
    topic_restrictions = ""
    if audience == "child":
        async with pool.acquire() as connection:
            async with connection.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(
                    "SELECT persona, topic_restrictions FROM companion_settings WHERE user_id = %s",
                    (user["id"],),
                )
                settings_row = await cursor.fetchone()
        if settings_row:
            persona = settings_row["persona"] or "netral"
            topic_restrictions = settings_row["topic_restrictions"] or ""
    reply = await call_deepseek(
        context, history, audience=audience, persona=persona, topic_restrictions=topic_restrictions
    )

    reply_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO companion_messages (id, conversation_id, role, content) VALUES (%s, %s, 'assistant', %s)",
                (reply_id, conversation_id, reply),
            )
    return {"conversationId": conversation_id, "reply": reply, "messageId": reply_id}


@api_router.get("/companion/settings")
async def get_companion_settings(user: Dict[str, Any] = Depends(get_current_user)):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT persona, topic_restrictions AS topicRestrictions FROM companion_settings WHERE user_id = %s",
                (user["id"],),
            )
            settings_row = await cursor.fetchone()
    if not settings_row:
        return {"persona": "netral", "topicRestrictions": ""}
    settings_row["topicRestrictions"] = settings_row["topicRestrictions"] or ""
    return settings_row


@api_router.put("/companion/settings")
async def update_companion_settings(
    payload: CompanionSettingsInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    if payload.persona not in {"ceria", "tenang", "netral"}:
        raise HTTPException(status_code=422, detail="Persona tidak valid")
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO companion_settings (user_id, persona, topic_restrictions)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE persona = VALUES(persona),
                    topic_restrictions = VALUES(topic_restrictions)
                """,
                (user["id"], payload.persona, payload.topicRestrictions),
            )
    return {"persona": payload.persona, "topicRestrictions": payload.topicRestrictions or ""}


@api_router.get("/companion/sessions")
async def get_companion_sessions(user: Dict[str, Any] = Depends(get_current_user)):
    """Lists the child's per-visit AI Companion sessions with full transcript + AI summary
    (parent-facing view — never includes the parent's own Luna Help conversation)."""
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                SELECT cc.id AS conversationId, cc.created_at AS createdAt,
                       COUNT(cm.id) AS messageCount,
                       MIN(cm.created_at) AS firstMessageAt, MAX(cm.created_at) AS lastMessageAt
                FROM companion_conversations cc
                LEFT JOIN companion_messages cm ON cm.conversation_id = cc.id
                WHERE cc.user_id = %s AND cc.audience = 'child'
                GROUP BY cc.id, cc.created_at
                HAVING messageCount > 0
                ORDER BY cc.created_at DESC
                """,
                (user["id"],),
            )
            conversation_rows = await cursor.fetchall()

            sessions = []
            for row in conversation_rows:
                conversation_id = row["conversationId"]
                await cursor.execute(
                    "SELECT role, content, created_at AS createdAt FROM companion_messages "
                    "WHERE conversation_id = %s ORDER BY created_at",
                    (conversation_id,),
                )
                messages = await cursor.fetchall()

                await cursor.execute(
                    "SELECT message_count AS messageCount, summary FROM companion_conversation_summaries "
                    "WHERE conversation_id = %s",
                    (conversation_id,),
                )
                cached = await cursor.fetchone()
                if not cached or cached["messageCount"] != row["messageCount"]:
                    summary = await summarize_session(messages)
                    await cursor.execute(
                        """
                        INSERT INTO companion_conversation_summaries (conversation_id, message_count, summary)
                        VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE message_count = VALUES(message_count), summary = VALUES(summary)
                        """,
                        (conversation_id, row["messageCount"], summary),
                    )
                else:
                    summary = cached["summary"]

                for message in messages:
                    message["createdAt"] = message["createdAt"].isoformat() if message["createdAt"] else None
                sessions.append(
                    {
                        "conversationId": conversation_id,
                        "createdAt": row["createdAt"].isoformat() if row["createdAt"] else None,
                        "messageCount": row["messageCount"],
                        "firstMessageAt": row["firstMessageAt"].isoformat() if row["firstMessageAt"] else None,
                        "lastMessageAt": row["lastMessageAt"].isoformat() if row["lastMessageAt"] else None,
                        "summary": summary,
                        "messages": messages,
                    }
                )
    return {"sessions": sessions}


@api_router.get("/progress")
async def get_progress(
    user: Dict[str, Any] = Depends(get_current_user),
    range_name: str = Query("7d", alias="range"),
):
    range_config = {"7d": (6, "DAY"), "1m": (29, "DAY"), "1y": (365, "DAY")}
    if range_name not in range_config:
        raise HTTPException(status_code=422, detail="Rentang progress tidak valid")
    range_size, range_unit = range_config[range_name]
    today = datetime.now(timezone.utc).date()
    is_year = range_name == "1y"
    period_sql = "DATE(completed_at)"
    activity_period_sql = "activity_date"
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT COUNT(*) AS total, SUM(status = 'completed') AS completed, "
                "COALESCE(AVG(focus_score), 0) AS focus FROM lesson_progress WHERE user_id = %s",
                (user["id"],),
            )
            lesson_stats = await cursor.fetchone()
            await cursor.execute(
                "SELECT COUNT(*) AS attempts, COALESCE(AVG(score / total * 100), 0) AS average_score "
                "FROM quiz_attempts WHERE user_id = %s",
                (user["id"],),
            )
            quiz_stats = await cursor.fetchone()
            await cursor.execute(
                "SELECT activity_date FROM daily_activity WHERE user_id = %s "
                "ORDER BY activity_date DESC",
                (user["id"],),
            )
            activity_dates = [row["activity_date"] for row in await cursor.fetchall()]
            await cursor.execute(
                f"SELECT {activity_period_sql} AS activity_date, SUM(minutes) AS minutes FROM daily_activity "
                f"WHERE user_id = %s AND activity_date >= CURRENT_DATE - INTERVAL {range_size} {range_unit} "
                "GROUP BY activity_date ORDER BY activity_date",
                (user["id"],),
            )
            weekly_activity = await cursor.fetchall()
            await cursor.execute(
                "SELECT DATE(occurred_at) AS activity_date, COUNT(*) AS focus_losses "
                "FROM focus_events WHERE user_id = %s AND occurred_at >= CURRENT_DATE - INTERVAL %s DAY "
                "GROUP BY DATE(occurred_at)",
                (user["id"], range_size if not is_year else 365),
            )
            focus_activity = await cursor.fetchall()
            await cursor.execute(
                f"SELECT {period_sql} AS activity_date, COUNT(*) AS completed "
                "FROM lesson_completion_events WHERE user_id = %s "
                f"AND completed_at >= CURRENT_DATE - INTERVAL {range_size} {range_unit} "
                "GROUP BY activity_date",
                (user["id"],),
            )
            weekly_completed = await cursor.fetchall()
            await cursor.execute(
                f"SELECT DATE(completed_at) AS activity_date, COUNT(*) AS completed "
                "FROM lesson_progress WHERE user_id = %s AND status = 'completed' "
                f"AND completed_at >= CURRENT_DATE - INTERVAL {range_size} {range_unit} "
                "GROUP BY DATE(completed_at)",
                (user["id"],),
            )
            legacy_completed = await cursor.fetchall()
            await cursor.execute(
                "SELECT lp.lesson_id AS id, l.name, ch.title AS chapter, c.title AS course, "
                "lp.completed_at AS date FROM lesson_progress lp "
                "JOIN lessons l ON l.id = lp.lesson_id "
                "JOIN chapters ch ON ch.id = l.chapter_id "
                "LEFT JOIN courses c ON c.id = ch.course_id "
                "WHERE lp.user_id = %s AND lp.status = 'completed' ORDER BY lp.completed_at DESC",
                (user["id"],),
            )
            completed_materials = await cursor.fetchall()
            await cursor.execute(
                "SELECT COUNT(*) AS completed_courses FROM ("
                "SELECT ch.course_id FROM lesson_progress lp "
                "JOIN lessons l ON l.id = lp.lesson_id "
                "JOIN chapters ch ON ch.id = l.chapter_id "
                "WHERE lp.user_id = %s AND lp.status = 'completed' AND ch.course_id IS NOT NULL "
                "GROUP BY ch.course_id HAVING COUNT(DISTINCT lp.lesson_id) >= "
                "(SELECT COUNT(*) FROM lessons all_lessons JOIN chapters all_chapters ON all_chapters.id = all_lessons.chapter_id "
                "WHERE all_chapters.course_id = ch.course_id)"
                ") completed_courses",
                (user["id"],),
            )
            completed_course_stats = await cursor.fetchone()
            await cursor.execute(
                "SELECT cc.id, cc.title AS name, "
                "CASE WHEN cc.id = 'motorik' THEN "
                "CASE WHEN EXISTS (SELECT 1 FROM lesson_progress lp2 "
                "JOIN lessons l2 ON l2.id = lp2.lesson_id JOIN chapters ch2 ON ch2.id = l2.chapter_id "
                "WHERE lp2.user_id = %s AND lp2.status = 'completed' AND ch2.course_id = 'c-motorik') "
                "THEN 100 ELSE 0 END "
                "ELSE COALESCE(AVG(qa.score / qa.total * 100), 0) END AS nilai "
                "FROM course_categories cc "
                "LEFT JOIN quizzes q ON q.category_id = cc.id "
                "LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = %s "
                "WHERE cc.id IN ('visual', 'emosi', 'motorik') GROUP BY cc.id, cc.title "
                "ORDER BY cc.sort_order",
                (user["id"], user["id"]),
            )
            category_scores = await cursor.fetchall()

    streak = 0
    for index, activity_date in enumerate(activity_dates):
        if activity_date != today - timedelta(days=index):
            break
        streak += 1
    def period_date(value):
        if isinstance(value, str):
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        return value.date() if hasattr(value, "date") else value

    activity_by_date = {period_date(row["activity_date"]): row["minutes"] for row in weekly_activity}
    completed_by_date = {period_date(row["activity_date"]): row["completed"] for row in weekly_completed}
    focus_by_date = {period_date(row["activity_date"]): row["focus_losses"] for row in focus_activity}
    focus_loss_total = sum(focus_by_date.values())
    focus_level = max(0, 100 - focus_loss_total * 10)
    for row in legacy_completed:
        legacy_date = period_date(row["activity_date"])
        completed_by_date.setdefault(legacy_date, 0)
        completed_by_date[legacy_date] = max(completed_by_date[legacy_date], row["completed"])
    if is_year:
        def month_start(value):
            return value.replace(day=1)

        activity_by_date = {
            month_start(date): sum(minutes for entry_date, minutes in activity_by_date.items() if month_start(entry_date) == month_start(date))
            for date in activity_by_date
        }
        completed_by_date = {
            month_start(date): sum(count for entry_date, count in completed_by_date.items() if month_start(entry_date) == month_start(date))
            for date in completed_by_date
        }
        focus_by_date = {
            month_start(date): sum(count for entry_date, count in focus_by_date.items() if month_start(entry_date) == month_start(date))
            for date in focus_by_date
        }
        start_month = today.year * 12 + today.month - 1 - 11
        period_dates = [datetime((start_month + index) // 12, (start_month + index) % 12 + 1, 1).date() for index in range(12)]
        month_labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        period_labels = [f"{month_labels[period.month - 1]} {period.year}" for period in period_dates]
    else:
        period_dates = [today - timedelta(days=range_size - index) for index in range(range_size + 1)]
        day_names = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        period_labels = [str(period.day) for period in period_dates] if range_name == "1m" else [
            f"{day_names[period.weekday()]} {period.day}"
            for period in period_dates
        ]
    total_materi = lesson_stats["total"] or 0
    selesai = lesson_stats["completed"] or 0
    rata_nilai = round(float(quiz_stats["average_score"] or 0))
    ai_stats = {
        "totalMateri": total_materi,
        "selesai": selesai,
        "rataNilai": rata_nilai,
        "streak": streak,
        "focusLevel": focus_level,
    }
    ai_analysis = await generate_progress_analysis(pool, user["id"], ai_stats)

    return {
        "stats": {
            "totalMateri": total_materi,
            "selesai": selesai,
            "rataNilai": rata_nilai,
            "streak": streak,
        },
        "focusLevel": focus_level,
        "ai": ai_analysis,
        "quizAttempts": quiz_stats["attempts"] or 0,
        "completedMaterials": [
            {
                "id": row["id"],
                "title": row["name"],
                "chapter": row["chapter"],
                "course": row["course"],
                "date": row["date"].strftime("%d %b %Y") if row["date"] else None,
            }
            for row in completed_materials
        ],
        "moduleSelesai": completed_course_stats["completed_courses"] or 0,
        "subModuleSelesai": lesson_stats["completed"] or 0,
        "categoryScores": [
            {"name": row["name"], "nilai": round(float(row["nilai"] or 0))}
            for row in category_scores
        ],
        "weekly": [
            {
                "week": period_labels[index],
                "fokus": focus_by_date.get(period_dates[index], 0),
                "penyelesaian": completed_by_date.get(period_dates[index], 0),
            }
            for index in range(len(period_dates))
        ],
    }


@api_router.post("/screening/sessions")
async def create_screening_session(
    payload: ScreeningSessionInput,
    user: Dict[str, Any] = Depends(get_current_user),
):
    session_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, method FROM screening_definitions WHERE id = %s AND is_published = TRUE",
                (payload.definition_id,),
            )
            definition = await cursor.fetchone()
            if not definition:
                raise HTTPException(status_code=404, detail="Definisi screening tidak ditemukan")

            await cursor.execute(
                "SELECT id, risk_answer FROM screening_questions WHERE definition_id = %s",
                (payload.definition_id,),
            )
            questions = await cursor.fetchall()
            if definition["method"] == "mchat" and not questions:
                raise HTTPException(status_code=404, detail="Definisi screening tidak ditemukan")
            score = payload.score
            if score is None and definition["method"] == "mchat":
                mchat_result = analyze_mchat(payload.answers, questions)
                score = mchat_result["score"]
            analysis = None
            if payload.gaze_session is not None:
                try:
                    features = extract_features(payload.gaze_session)
                    analysis = {
                        "features": features,
                        "classification": {
                            **classify_threshold(features),
                            "level": "Level 1",
                            "confidence": round(features["pct_sosial"]),
                            "message": "Membutuhkan analisis lanjutan" if features["pct_geometris"] >= 69 else "Tidak menunjukkan indikasi kuat pada screening ini",
                        },
                    }
                except (KeyError, TypeError, ValueError) as error:
                    raise HTTPException(status_code=422, detail=f"Data gaze tidak valid: {error}")
            if definition["method"] == "mchat":
                analysis = {"classification": analyze_mchat(payload.answers, questions)}
            await cursor.execute(
                "INSERT INTO screening_sessions "
                "(id, user_id, definition_id, score, result, gaze_data, analysis) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    session_id,
                    user["id"],
                    payload.definition_id,
                    score,
                    payload.result,
                    json.dumps(payload.gaze_session) if payload.gaze_session is not None else None,
                    json.dumps(analysis) if analysis is not None else None,
                ),
            )
            answer_rows = [
                (session_id, question_id, str(answer))
                for question_id, answer in payload.answers.items()
                if isinstance(answer, (str, int, float, bool))
            ]
            if answer_rows:
                await cursor.executemany(
                    "INSERT INTO screening_answers (session_id, question_id, answer) VALUES (%s, %s, %s)",
                    answer_rows,
                )
    classification = analysis.get("classification") if analysis else None
    result = payload.result or (classification["message"] if classification else None)
    return {"id": session_id, "score": score, "result": result, "analysis": analysis}


@api_router.get("/screening/sessions")
async def get_screening_sessions(user: Dict[str, Any] = Depends(get_current_user)):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                """
                  SELECT s.id, s.score, s.result, s.created_at AS createdAt,
                      d.method, d.title, d.version, s.gaze_data AS gazeData,
                      s.analysis
                FROM screening_sessions s
                JOIN screening_definitions d ON d.id = s.definition_id
                WHERE s.user_id = %s ORDER BY s.created_at DESC
                """,
                (user["id"],),
            )
            sessions = await cursor.fetchall()
    for session in sessions:
        session["gazeData"] = decode_json(session["gazeData"])
        session["analysis"] = decode_json(session["analysis"])
    return sessions


@api_router.get("/screening/summary")
async def get_screening_summary(user: Dict[str, Any] = Depends(get_current_user)):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT d.method, s.analysis, s.result, s.score, s.created_at "
                "FROM screening_sessions s JOIN screening_definitions d ON d.id = s.definition_id "
                "WHERE s.user_id = %s ORDER BY s.created_at DESC",
                (user["id"],),
            )
            rows = await cursor.fetchall()
    summary = {}
    for row in rows:
        if row["method"] in summary:
            continue
        analysis = decode_json(row["analysis"]) or {}
        classification = analysis.get("classification") or {}
        summary[row["method"]] = {
            "method": row["method"],
            "level": classification.get("level", "Level 1"),
            "confidence": classification.get("confidence"),
            "result": row["result"] or classification.get("message"),
            "needsFollowUp": classification.get("needs_follow_up", True),
            "date": row["created_at"].isoformat() if row["created_at"] else None,
        }
    confidences = [str(summary[key]["confidence"]) for key in ("gaze", "mchat") if summary.get(key, {}).get("confidence") is not None]
    levels = [summary[key]["level"] for key in ("gaze", "mchat") if summary.get(key)]
    return {
        "level": levels[0] if levels else "Level 1",
        "confidence": "|".join(confidences) if confidences else None,
        "results": summary,
        "needsFollowUp": any(item.get("needsFollowUp") for item in summary.values()),
        "message": "Membutuhkan analisis lanjutan" if any(item.get("needsFollowUp") for item in summary.values()) else "Screening tersimpan",
    }


@api_router.get("/admin/courses")
async def admin_list_courses(_: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, title, image_url, description, sort_order, is_published "
                "FROM courses ORDER BY sort_order, title"
            )
            return await cursor.fetchall()


@api_router.post("/admin/courses")
async def admin_create_course(payload: CourseInput, _: Dict[str, Any] = Depends(get_admin_user)):
    course_id = f"course-{uuid.uuid4().hex[:12]}"
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO courses (id, title, image_url, description, sort_order, is_published) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (course_id, payload.title, payload.image_url, payload.description, payload.sort_order, payload.is_published),
            )
    return {"id": course_id, **payload.model_dump()}


@api_router.put("/admin/courses/{course_id}")
async def admin_update_course(course_id: str, payload: CourseInput, _: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "UPDATE courses SET title = %s, image_url = %s, description = %s, "
                "sort_order = %s, is_published = %s WHERE id = %s",
                (payload.title, payload.image_url, payload.description, payload.sort_order, payload.is_published, course_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Course tidak ditemukan")
    return {"id": course_id, **payload.model_dump()}


@api_router.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str, _: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute("DELETE FROM courses WHERE id = %s", (course_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Course tidak ditemukan")
    return {"deleted": course_id}


@api_router.get("/admin/news")
async def admin_list_news(_: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(
                "SELECT id, title, tag, source, source_url, image_url, excerpt, content, is_published "
                "FROM news_articles ORDER BY published_at DESC, title"
            )
            return await cursor.fetchall()


@api_router.post("/admin/news")
async def admin_create_news(payload: NewsInput, _: Dict[str, Any] = Depends(get_admin_user)):
    article_id = f"news-{uuid.uuid4().hex[:12]}"
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO news_articles (id, title, tag, source, source_url, image_url, excerpt, content, "
                "published_at, is_published) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s)",
                (article_id, payload.title, payload.tag, payload.source, payload.source_url, payload.image_url,
                 payload.excerpt, payload.content, payload.is_published),
            )
    return {"id": article_id, **payload.model_dump()}


@api_router.put("/admin/news/{article_id}")
async def admin_update_news(article_id: str, payload: NewsInput, _: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "UPDATE news_articles SET title = %s, tag = %s, source = %s, source_url = %s, image_url = %s, "
                "excerpt = %s, content = %s, is_published = %s WHERE id = %s",
                (payload.title, payload.tag, payload.source, payload.source_url, payload.image_url,
                 payload.excerpt, payload.content, payload.is_published, article_id),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    return {"id": article_id, **payload.model_dump()}


@api_router.delete("/admin/news/{article_id}")
async def admin_delete_news(article_id: str, _: Dict[str, Any] = Depends(get_admin_user)):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute("DELETE FROM news_articles WHERE id = %s", (article_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    return {"deleted": article_id}


@api_router.post("/auth/register")
async def register(payload: RegisterInput):
    email = str(payload.email).lower()
    user_id = str(uuid.uuid4())
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            try:
                await cursor.execute(
                    "INSERT INTO users (id, name, email, password_hash, child) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (user_id, payload.name.strip(), email, pwd_context.hash(payload.password), "{}"),
                )
            except aiomysql.IntegrityError:
                raise HTTPException(status_code=400, detail="Email sudah terdaftar")
            await cursor.execute(
                "INSERT INTO child_profiles (id, user_id) VALUES (%s, %s)",
                (str(uuid.uuid4()), user_id),
            )
    user = await find_user_by_id(user_id)
    return {"token": create_token(user_id), "user": public_user(user)}


@api_router.post("/auth/login")
async def login(payload: LoginInput):
    async with pool.acquire() as connection:
        async with connection.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute("SELECT * FROM users WHERE email = %s", (str(payload.email).lower(),))
            user = await cursor.fetchone()
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    return {"token": create_token(user["id"]), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": user}


@api_router.put("/users/child-data")
async def update_child_data(data: ChildDataInput, user: Dict[str, Any] = Depends(get_current_user)):
    current = await find_user_by_id(user["id"])
    child = decode_json(current.get("child")) or {}
    child.update({key: value for key, value in data.model_dump().items() if value is not None})
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute("UPDATE users SET child = %s WHERE id = %s", (json.dumps(child), user["id"]))
            values = data.model_dump()
            dob_value = values.get("dob") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", values.get("dob") or "") else None
            await cursor.execute(
                """
                INSERT INTO child_profiles
                    (id, user_id, full_name, nickname, age, dob, gender, blood_type,
                     diagnosis, diagnosis_date, school, grade, therapist, hobbies,
                     parent_name, parent_contact, address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name), nickname = VALUES(nickname), age = VALUES(age),
                    dob = VALUES(dob), gender = VALUES(gender), blood_type = VALUES(blood_type),
                    diagnosis = VALUES(diagnosis), diagnosis_date = VALUES(diagnosis_date),
                    school = VALUES(school), grade = VALUES(grade), therapist = VALUES(therapist),
                    hobbies = VALUES(hobbies), parent_name = VALUES(parent_name),
                    parent_contact = VALUES(parent_contact), address = VALUES(address)
                """,
                (
                    str(uuid.uuid4()), user["id"], values.get("fullName"), values.get("nickname"),
                    values.get("age"), dob_value, values.get("gender"), values.get("bloodType"),
                    values.get("diagnosis"), values.get("diagnosisDate"), values.get("school"),
                    values.get("grade"), values.get("therapist"), json.dumps(values.get("hobbies"))
                    if values.get("hobbies") is not None else None, values.get("parentName"),
                    values.get("parentContact"), values.get("address"),
                ),
            )
    return {"user": public_user(await find_user_by_id(user["id"]))}


@api_router.put("/users/autism-test")
async def update_autism_test(data: AutismTestInput, user: Dict[str, Any] = Depends(get_current_user)):
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                "UPDATE users SET autism_test = %s WHERE id = %s",
                (json.dumps(data.model_dump()), user["id"]),
            )
    return {"user": public_user(await find_user_by_id(user["id"]))}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)