"""Deepseek-backed AI Companion: chat context building and completion calls."""
import json
import os
from pathlib import Path
import re
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv
import reprlib

# Loaded independently so DEEPSEEK_API_KEY is set regardless of import order in server.py.
load_dotenv(Path(__file__).parent / ".env")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

STUB_REPLY = (
    "AI Companion belum terhubung ke Deepseek API (DEEPSEEK_API_KEY belum diisi). "
    "Ini adalah balasan contoh sementara."
)

SYSTEM_PROMPT_PREFIX = """Kamu adalah Luna, teman AI untuk anak usia 7-12 tahun pengguna AutiGaze.

GAYA BICARA:
- Bicara LANGSUNG ke anak dengan sapaan "kamu". JANGAN PERNAH menyebut anak
  sebagai "si kecil", "anak ini", atau sudut pandang orang ketiga lainnya.
- Kalimat pendek, satu ide per kalimat.
- Bahasa konkret dan harfiah. Jangan pakai idiom, sarkasme, atau kiasan.
- Nada hangat dan konsisten di setiap balasan, seperti teman sebaya yang suportif.
- Kosakata sederhana setara bacaan anak SD.
- JANGAN gunakan emoji, simbol, atau format markdown apapun.
- Pujian spesifik dan konkret, bukan pujian umum berlebihan.
- Jangan pernah menyebutkan angka, persentase, atau istilah teknis
  (skor, fokus, durasi, status) secara langsung — sampaikan sebagai
  kesan kualitatif yang hangat.

CONTOH GAYA YANG BENAR:
Anak: "aku males lagi"
Luna: "Oke, gapapa. Mau istirahat atau cerita sesuatu ke aku?"
Anak: (baru selesai latihan dengan hasil bagus)
Luna: "Tadi kamu cepat banget menyelesaikannya! Aku suka lihat kamu coba."

DATA PERKEMBANGAN ANAK (gunakan sebagai konteks nada bicara saja,
JANGAN pernah dikutip mentah ke anak):
"""

PARENT_SYSTEM_PROMPT_PREFIX = """Kamu adalah Luna Help, asisten AI AutiGaze untuk orang tua/wali dari
anak pengguna AutiGaze.

GAYA BICARA:
- Bicara langsung kepada orang tua ("Anda"), bukan kepada anak.
- Boleh dan sebaiknya menyebutkan data konkret: skor, persentase, tingkat
  fokus, durasi pengerjaan, dan riwayat penyelesaian materi, karena orang tua
  butuh informasi ini untuk memantau perkembangan anak.
- Jelaskan data dengan ringkas, jujur, dan mudah dipahami, lalu berikan
  insight atau saran praktis bila relevan.
- Nada profesional namun tetap hangat dan suportif.
- JANGAN gunakan emoji, simbol, atau format markdown apapun.

DATA PERKEMBANGAN ANAK (boleh dikutip dan dijelaskan ke orang tua):
"""

PERSONA_TONE_INSTRUCTIONS = {
    "ceria": "NADA BICARA: Ceria dan bersemangat. Gunakan kalimat yang antusias dan penuh semangat, "
    "tapi tetap sederhana dan tidak berlebihan.",
    "tenang": "NADA BICARA: Tenang dan lembut. Gunakan kalimat yang pelan, menenangkan, dan penuh kesabaran.",
    "netral": "NADA BICARA: Netral dan stabil. Gunakan kalimat yang seimbang, tidak terlalu ceria maupun terlalu tenang.",
}

SESSION_SUMMARY_PROMPT = """Kamu membantu meringkas satu sesi percakapan antara seorang anak dan
Luna (AI Companion) untuk dibaca oleh orang tua/wali anak tersebut.

ATURAN RINGKASAN:
- Tulis 2-4 kalimat ringkas berbahasa Indonesia.
- Fokus pada suasana hati anak dan topik yang dibicarakan secara umum.
- JANGAN mengarang informasi yang tidak ada dalam percakapan.
- Nada ringkasan netral dan informatif untuk orang tua.
"""

PROGRESS_ANALYSIS_PROMPT = """Kamu adalah asisten analisis perkembangan belajar pada aplikasi
AutiGaze, menulis untuk orang tua/wali anak.

Berdasarkan ringkasan statistik dan riwayat belajar anak yang diberikan, balas HANYA dengan
JSON valid (tanpa markdown code fence, tanpa teks lain) dengan struktur PERSIS seperti ini:
{
  "focusSummary": "1-2 kalimat tentang tingkat fokus anak berdasarkan data.",
  "developmentSummary": "1-2 kalimat tentang perkembangan belajar anak secara keseluruhan.",
  "strengths": ["poin kelebihan singkat", "..."],
  "improvements": ["poin yang perlu ditingkatkan", "..."],
  "recommendations": ["rekomendasi praktis untuk orang tua", "..."]
}

ATURAN:
- Bahasa Indonesia, hangat, ringkas, dan berbasis data yang diberikan.
- JANGAN mengarang data yang tidak ada di dalam data yang diberikan.
- Setiap array berisi 2-3 poin singkat (maksimal 1 kalimat per poin).
"""


_EMOJI_SYMBOL_PATTERN = re.compile(
    "[\U0001F300-\U0001FAFF\u2600-\u27BF\u2190-\u21FF]", flags=re.UNICODE
)
_MARKDOWN_PATTERN = re.compile(r"[*_~`#\[\]]")

def sanitize_reply(text: str) -> str:
    text = _EMOJI_SYMBOL_PATTERN.sub("", text)
    text = _MARKDOWN_PATTERN.sub("", text)
    return re.sub(r"\s{2,}", " ", text).strip()

async def build_learning_context(pool, user_id: str) -> str:
    """Summarize the child's recent per-lesson duration/focus and per-quiz scores."""
    async with pool.acquire() as connection:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                SELECT l.name, ch.title AS chapter, c.title AS course, lp.status,
                       lp.focus_score, lp.score,
                       COALESCE(lp.duration_seconds, TIMESTAMPDIFF(SECOND, lp.started_at, lp.completed_at)) AS duration_seconds
                FROM lesson_progress lp
                JOIN lessons l ON l.id = lp.lesson_id
                JOIN chapters ch ON ch.id = l.chapter_id
                LEFT JOIN courses c ON c.id = ch.course_id
                WHERE lp.user_id = %s
                ORDER BY lp.started_at DESC
                LIMIT 20
                """,
                (user_id,),
            )
            lesson_rows = await cursor.fetchall()

            await cursor.execute(
                """
                SELECT qa.quiz_id, qa.score, qa.total, qa.created_at, q.title
                FROM quiz_attempts qa
                LEFT JOIN quizzes q ON q.id = qa.quiz_id
                WHERE qa.user_id = %s
                ORDER BY qa.created_at DESC
                LIMIT 20
                """,
                (user_id,),
            )
            quiz_rows = await cursor.fetchall()

    lines = ["Riwayat belajar anak (data terbaru):"]
    for name, chapter, course, status, focus_score, nilai, duration_seconds in lesson_rows:
        parts = [f"- Lesson '{name}'"]
        if course:
            parts.append(f"(course: {course}, chapter: {chapter})")
        parts.append(f"status={status}")
        if nilai is not None:
            parts.append(f"nilai={nilai}")
        if focus_score is not None:
            parts.append(f"fokus={focus_score}")
        if duration_seconds is not None:
            parts.append(f"durasi={duration_seconds}s")
        lines.append(" ".join(parts))

    for quiz_id, score, total, created_at, title in quiz_rows:
        pct = round(score / total * 100) if total else 0
        lines.append(
            f"- Quiz '{title or quiz_id}': skor {score}/{total} ({pct}%) pada {created_at}"
        )

    if len(lines) == 1:
        lines.append("- Belum ada aktivitas belajar tercatat.")

    return "\n".join(lines)


async def call_deepseek(
    context: str,
    history: List[Dict[str, str]],
    audience: str = "child",
    persona: str = "netral",
    topic_restrictions: str = "",
) -> str:
    """Call Deepseek chat completions; returns a stub reply if no API key is configured.

    `audience` selects the persona family: "child" (Luna, no concrete data) or
    "parent" (progress-report assistant, may cite concrete data). `persona` and
    `topic_restrictions` only apply to the child audience (parent-configured
    tone preset + topics to avoid when talking with the child).
    """
    if not DEEPSEEK_API_KEY:
        return STUB_REPLY

    if audience == "parent":
        prompt_prefix = PARENT_SYSTEM_PROMPT_PREFIX
    else:
        tone = PERSONA_TONE_INSTRUCTIONS.get(persona, PERSONA_TONE_INSTRUCTIONS["netral"])
        restrictions = (
            f"\nBATASAN TOPIK (hindari topik berikut sesuai permintaan orang tua): {topic_restrictions}\n"
            if topic_restrictions
            else ""
        )
        prompt_prefix = f"{SYSTEM_PROMPT_PREFIX}\n{tone}\n{restrictions}"

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": prompt_prefix + context},
        *history,
    ]
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={"model": DEEPSEEK_MODEL, "messages": messages},
        )
        response.raise_for_status()
        data = response.json()
    content = data["choices"][0]["message"]["content"]
    return sanitize_reply(content)


async def summarize_session(messages: List[Dict[str, str]]) -> str:
    """Generate a short parent-facing summary of one day's companion messages."""
    if not messages:
        return "Belum ada percakapan pada sesi ini."
    if not DEEPSEEK_API_KEY:
        return f"Sesi ini berisi {len(messages)} pesan antara anak dan Luna (ringkasan AI belum aktif)."

    transcript = "\n".join(f"{message['role']}: {message['content']}" for message in messages)
    request_messages = [
        {"role": "system", "content": SESSION_SUMMARY_PROMPT},
        {"role": "user", "content": f"Transkrip percakapan:\n{transcript}"},
    ]
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={"model": DEEPSEEK_MODEL, "messages": request_messages},
        )
        response.raise_for_status()
        data = response.json()
    return sanitize_reply(data["choices"][0]["message"]["content"])


def _heuristic_progress_analysis(stats: Dict[str, Any]) -> Dict[str, Any]:
    """Data-driven fallback used when Deepseek is unavailable or returns bad JSON."""
    total_materi = stats.get("totalMateri", 0)
    selesai = stats.get("selesai", 0)
    rata_nilai = stats.get("rataNilai", 0)
    streak = stats.get("streak", 0)
    focus_level = stats.get("focusLevel", 0)

    if total_materi == 0:
        return {
            "focusSummary": "Selesaikan materi untuk mulai membentuk ringkasan fokus.",
            "developmentSummary": "Data perkembangan akan muncul setelah aktivitas belajar tercatat.",
            "strengths": [],
            "improvements": [],
            "recommendations": ["Ajak anak mencoba materi pertama untuk mulai mengumpulkan data."],
        }

    focus_summary = (
        f"Tingkat fokus anak saat ini berada di angka {focus_level}%, "
        + ("menunjukkan konsentrasi yang baik selama belajar." if focus_level >= 80
           else "masih berfluktuasi dan bisa ditingkatkan dengan sesi belajar yang lebih pendek." if focus_level >= 50
           else "sering terganggu, perlu pendampingan lebih dekat saat sesi belajar.")
    )
    development_summary = (
        f"Anak telah menyelesaikan {selesai} dari {total_materi} materi dengan rata-rata nilai kuis {rata_nilai}%."
    )

    strengths = []
    improvements = []
    recommendations = []

    if streak >= 3:
        strengths.append(f"Konsisten belajar {streak} hari berturut-turut.")
    if rata_nilai >= 70:
        strengths.append("Nilai rata-rata kuis tergolong baik.")
    if focus_level >= 80:
        strengths.append("Mampu menjaga fokus dengan baik selama belajar.")
    if not strengths:
        strengths.append("Sudah mulai membangun kebiasaan belajar rutin.")

    if focus_level < 50:
        improvements.append("Fokus masih mudah teralihkan, perlu strategi untuk menjaga konsentrasi.")
    if rata_nilai < 50 and total_materi > 0:
        improvements.append("Pemahaman materi masih perlu diperkuat, terlihat dari nilai kuis.")
    if streak < 3:
        improvements.append("Konsistensi belajar harian masih bisa ditingkatkan.")
    if not improvements:
        improvements.append("Pertahankan pola belajar yang sudah berjalan baik saat ini.")

    if focus_level < 50:
        recommendations.append("Coba sesi belajar lebih singkat dengan jeda istirahat lebih sering.")
    if rata_nilai < 70:
        recommendations.append("Dampingi anak mengulang materi yang nilainya masih rendah.")
    recommendations.append("Beri apresiasi atas usaha anak untuk menjaga motivasi belajar.")

    return {
        "focusSummary": focus_summary,
        "developmentSummary": development_summary,
        "strengths": strengths,
        "improvements": improvements,
        "recommendations": recommendations,
    }


async def generate_progress_analysis(pool, user_id: str, stats: Dict[str, Any]) -> Dict[str, Any]:
    """Generate the parent-facing 'Analisis AI' block for the Progress page.

    `stats` should include totalMateri, selesai, rataNilai, streak, focusLevel.
    """
    fallback = _heuristic_progress_analysis(stats)
    if not DEEPSEEK_API_KEY or stats.get("totalMateri", 0) == 0:
        return fallback

    context = await build_learning_context(pool, user_id)
    stats_summary = (
        f"Statistik ringkas: total materi={stats.get('totalMateri')}, "
        f"selesai={stats.get('selesai')}, rata-rata nilai kuis={stats.get('rataNilai')}%, "
        f"streak harian={stats.get('streak')} hari, tingkat fokus={stats.get('focusLevel')}%.\n\n"
    )
    request_messages = [
        {"role": "system", "content": PROGRESS_ANALYSIS_PROMPT},
        {"role": "user", "content": stats_summary + context},
    ]
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": request_messages,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return {
            "focusSummary": parsed.get("focusSummary") or fallback["focusSummary"],
            "developmentSummary": parsed.get("developmentSummary") or fallback["developmentSummary"],
            "strengths": parsed.get("strengths") or fallback["strengths"],
            "improvements": parsed.get("improvements") or fallback["improvements"],
            "recommendations": parsed.get("recommendations") or fallback["recommendations"],
        }
    except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError):
        return fallback
