"""M-CHAT screening analysis helpers."""


def analyze_mchat(answers: dict, questions: list[dict]) -> dict:
    """Calculate an indicative M-CHAT risk percentage and level."""
    if not questions:
        raise ValueError("Pertanyaan M-CHAT belum tersedia")

    risk_count = sum(answers.get(question["id"]) == question["risk_answer"] for question in questions)
    total = len(questions)
    confidence = round(risk_count / total * 100)
    level = "Level 1" if confidence < 40 else "Level 2" if confidence < 70 else "Level 3"
    return {
        "score": risk_count,
        "total": total,
        "confidence": confidence,
        "level": level,
        "needs_follow_up": confidence >= 40,
        "message": "Membutuhkan analisis lanjutan" if confidence >= 40 else "Tidak menunjukkan indikasi kuat pada screening ini",
    }
