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
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

try:
    from .gaze_analysis import classify_threshold, extract_features
except ImportError:
    from gaze_analysis import classify_threshold, extract_features

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
                if not statement or statement.upper().startswith(("CREATE DATABASE", "USE ", "INSERT ")):
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

            for statement in schema_statements:
                statement = statement.strip()
                if not statement or not statement.upper().startswith("INSERT "):
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
    focus_score: Optional[float] = None


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
                JOIN courses c ON c.id = %s
                GROUP BY ch.id, ch.title, ch.sort_order
                ORDER BY ch.sort_order
                """,
                (course_id,),
            )
            chapters = await cursor.fetchall()
    for chapter in chapters:
        chapter["modules"] = decode_json(chapter.pop("modules")) or []
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
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO lesson_progress (id, user_id, lesson_id, status, focus_score, completed_at)
                VALUES (%s, %s, %s, %s, %s, IF(%s = 'completed', CURRENT_TIMESTAMP(6), NULL))
                ON DUPLICATE KEY UPDATE status = VALUES(status), focus_score = VALUES(focus_score),
                    completed_at = IF(VALUES(status) = 'completed', CURRENT_TIMESTAMP(6), completed_at)
                """,
                (progress_id, user["id"], lesson_id, payload.status, payload.focus_score, payload.status),
            )
            await cursor.execute(
                "INSERT INTO daily_activity (user_id, activity_date, minutes) VALUES (%s, CURRENT_DATE, 1) "
                "ON DUPLICATE KEY UPDATE minutes = minutes + 1",
                (user["id"],),
            )
    return {"lessonId": lesson_id, "status": payload.status}


@api_router.get("/progress")
async def get_progress(user: Dict[str, Any] = Depends(get_current_user)):
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

    streak = 0
    today = datetime.now(timezone.utc).date()
    for index, activity_date in enumerate(activity_dates):
        if activity_date != today - timedelta(days=index):
            break
        streak += 1
    return {
        "stats": {
            "totalMateri": lesson_stats["total"] or 0,
            "selesai": lesson_stats["completed"] or 0,
            "rataNilai": round(float(quiz_stats["average_score"] or 0)),
            "streak": streak,
        },
        "focusLevel": round(float(lesson_stats["focus"] or 0)),
        "quizAttempts": quiz_stats["attempts"] or 0,
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
                score = sum(payload.answers.get(q["id"]) == q["risk_answer"] for q in questions)
            analysis = None
            if payload.gaze_session is not None:
                try:
                    features = extract_features(payload.gaze_session)
                    analysis = {
                        "features": features,
                        "classification": classify_threshold(features),
                    }
                except (KeyError, TypeError, ValueError) as error:
                    raise HTTPException(status_code=422, detail=f"Data gaze tidak valid: {error}")
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
    return {"id": session_id, "score": score, "result": payload.result, "analysis": analysis}


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