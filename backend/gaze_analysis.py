"""
gaze_analysis.py
-----------------
Modul analisis data gaze-tracking untuk fitur Screening (AutiGaze).

Alur:
  1. load_session()      -> baca file JSON hasil export dari frontend
  2. extract_features()  -> ubah rentetan titik gaze mentah jadi fitur teragregasi
  3. classify_threshold() -> klasifikasi awal berbasis ambang literatur (GeoPref Test, Pierce et al.)
  4. classify_ml()        -> placeholder untuk model ML (logistic regression / SVM) begitu
                             sudah ada beberapa sesi data untuk dilatih

Catatan penting:
  - Ini BUKAN alat diagnosis. Hasilnya hanya sinyal "tahap awal" untuk skrining,
    tidak menggantikan asesmen profesional.
  - Ambang 69% diambil dari studi Pierce et al. (GeoPref Test) untuk persentase
    fiksasi ke stimulus geometris/non-sosial.
"""

import json
from pathlib import Path
from typing import Literal


# ---------------------------------------------------------------------------
# 1. LOAD DATA
# ---------------------------------------------------------------------------

def load_session(json_path: str | Path) -> dict:
    """Baca 1 file JSON hasil export sesi screening."""
    with open(json_path, "r", encoding="utf-8") as f:
        session = json.load(f)

    required_keys = {"stimulusLayout", "gaze", "durationSeconds"}
    missing = required_keys - session.keys()
    if missing:
        raise ValueError(
            f"File tidak lengkap, field berikut tidak ditemukan: {missing}. "
            "Pastikan capture di frontend sudah menyertakan stimulusLayout."
        )
    return session


# ---------------------------------------------------------------------------
# 2. FEATURE EXTRACTION
# ---------------------------------------------------------------------------

def extract_features(session: dict) -> dict:
    """
    Ubah titik-titik gaze mentah jadi fitur teragregasi per sesi.

    Fitur yang dihasilkan:
      - pct_sosial, pct_geometris   : persentase waktu (dwell time) di tiap AOI
      - saccade_count               : jumlah perpindahan sisi sosial<->geometris
      - saccade_rate_per_sec        : saccade_count dibagi durasi sesi
      - latency_first_sosial_ms     : waktu sampai pertama kali melihat sisi sosial
      - avg_gaze_gap_ms             : rata-rata jarak antar sample (indikator kualitas tracking)
      - total_samples               : jumlah titik gaze valid dalam sesi
    """
    layout = session["stimulusLayout"]  # contoh: {"left": "geometris", "right": "sosial"}
    gaze = session["gaze"]

    if len(gaze) < 2:
        raise ValueError("Data gaze terlalu sedikit untuk dianalisis (minimal 2 titik).")

    # Mapping tiap titik: posisi (left/right) -> jenis stimulus (sosial/geometris)
    labeled = [
        {
            "t": g["timestamp"],
            "stimulus": layout[g["contentField"]],
        }
        for g in gaze
    ]
    labeled.sort(key=lambda p: p["t"])

    # --- Dwell time per stimulus (bobot = jarak waktu ke sample berikutnya) ---
    dwell = {"sosial": 0.0, "geometris": 0.0}
    gaps = []
    for i in range(len(labeled) - 1):
        dt = labeled[i + 1]["t"] - labeled[i]["t"]
        gaps.append(dt)
        dwell[labeled[i]["stimulus"]] += dt

    total_time = sum(dwell.values())
    pct_sosial = round(dwell["sosial"] / total_time * 100, 2)
    pct_geometris = round(dwell["geometris"] / total_time * 100, 2)

    # --- Saccade count (perpindahan sisi) ---
    saccade_count = sum(
        1 for i in range(1, len(labeled))
        if labeled[i]["stimulus"] != labeled[i - 1]["stimulus"]
    )
    duration_sec = session["durationSeconds"]
    saccade_rate = round(saccade_count / duration_sec, 2)

    # --- Latensi ke fiksasi sosial pertama ---
    first_sosial = next((p for p in labeled if p["stimulus"] == "sosial"), None)
    latency_first_sosial_ms = (
        round(first_sosial["t"] - labeled[0]["t"], 1) if first_sosial else None
    )

    avg_gap = round(sum(gaps) / len(gaps), 1) if gaps else None

    return {
        "pct_sosial": pct_sosial,
        "pct_geometris": pct_geometris,
        "saccade_count": saccade_count,
        "saccade_rate_per_sec": saccade_rate,
        "latency_first_sosial_ms": latency_first_sosial_ms,
        "avg_gaze_gap_ms": avg_gap,
        "total_samples": len(labeled),
    }


# ---------------------------------------------------------------------------
# 3. KLASIFIKASI — ATURAN AMBANG BERBASIS LITERATUR (dipakai sekarang)
# ---------------------------------------------------------------------------

GEOPREF_THRESHOLD_PCT = 69.0  # cutoff dari studi Pierce et al.

def classify_threshold(features: dict) -> dict:
    """
    Klasifikasi berbasis ambang tervalidasi literatur (bukan model terlatih sendiri).
    Cocok dipakai selama belum ada dataset berlabel untuk training model ML sendiri.
    """
    pct_geo = features["pct_geometris"]
    flagged = pct_geo >= GEOPREF_THRESHOLD_PCT

    return {
        "method": "threshold_geopref",
        "threshold_used_pct": GEOPREF_THRESHOLD_PCT,
        "pct_geometris": pct_geo,
        "flagged": flagged,
        "result_label": (
            "Perlu perhatian/asesmen lanjutan"
            if flagged
            else "Tidak menunjukkan indikasi kuat pada sesi ini"
        ),
        "disclaimer": (
            "Hasil ini adalah sinyal skrining tahap awal, BUKAN diagnosis. "
            "Untuk kepastian, disarankan konsultasi dengan profesional (psikolog/dokter anak)."
        ),
    }


# ---------------------------------------------------------------------------
# 4. KLASIFIKASI — MODEL ML (placeholder untuk pengembangan lanjut)
# ---------------------------------------------------------------------------

def classify_ml(features: dict, model_path: str | Path = "gaze_model.joblib") -> dict:
    """
    Placeholder untuk classifier ML (logistic regression / SVM dari scikit-learn),
    dipakai begitu sudah terkumpul cukup data sesi berlabel untuk training.

    Cara pakai nanti:
        import joblib
        model = joblib.load(model_path)
        X = [[features["pct_geometris"], features["saccade_rate_per_sec"],
              features["latency_first_sosial_ms"]]]
        proba = model.predict_proba(X)[0][1]

    Untuk sekarang, fungsi ini belum aktif karena belum ada model terlatih.
    """
    raise NotImplementedError(
        "Model ML belum dilatih. Gunakan classify_threshold() untuk saat ini. "
        "Setelah terkumpul beberapa sesi data berlabel, latih model dengan "
        "scikit-learn (LogisticRegression/SVC) menggunakan fitur dari extract_features()."
    )


# ---------------------------------------------------------------------------
# CONTOH PEMAKAIAN (jalankan langsung: python gaze_analysis.py path/ke/file.json)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "autigaze-gaze-1787390748293.json"

    session = load_session(path)
    features = extract_features(session)
    result = classify_threshold(features)

    print("=== FITUR HASIL EKSTRAKSI ===")
    for k, v in features.items():
        print(f"  {k}: {v}")

    print("\n=== HASIL SKRINING (aturan ambang) ===")
    for k, v in result.items():
        print(f"  {k}: {v}")
