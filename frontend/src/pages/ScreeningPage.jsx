import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Home, Loader2, Play, Camera } from "lucide-react";
import Header from "../components/Header";
// import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { API, authConfig } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "../components/ui/toaster";
import { ASSETS } from "@/mock";
import webgazer from "webgazer";

const STIMULUS_LAYOUT = {
  left: "geometris",
  right: "sosial",
};

const GazeScreening = ({ definition, onBack, onFinish, saving }) => {
  const [watched, setWatched] = useState(false);
  const [scene, setScene] = useState(1);
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const [calibrationClicks, setCalibrationClicks] = useState(0);
  const [calibrationStarted, setCalibrationStarted] = useState(false);
  const [calibrationReady, setCalibrationReady] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState("Tekan tombol untuk memulai kalibrasi.");
  const [webgazerLoaded, setWebgazerLoaded] = useState(Boolean(webgazer));
  const [gazePointer, setGazePointer] = useState(null);
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const mountedRef = useRef(true);
  const videoRef = useRef(null);
  const gazeDataRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const calibrationDataRef = useRef([]);
  const calibrationPoints = [
    { left: "8%", top: "10%" }, { left: "50%", top: "10%" }, { left: "92%", top: "10%" },
    { left: "8%", top: "50%" }, { left: "50%", top: "50%" }, { left: "92%", top: "50%" },
    { left: "8%", top: "90%" }, { left: "50%", top: "90%" }, { left: "92%", top: "90%" },
  ];

  useEffect(() => {
    webgazer.params.faceMeshSolutionPath = `${process.env.PUBLIC_URL || ""}/mediapipe/face_mesh`;
    window.webgazer = webgazer;
    setWebgazerLoaded(true);
    return () => {
      mountedRef.current = false;
      try { webgazer.clearGazeListener?.(); } catch { }
      try { webgazer.pause?.(); } catch { }
      try { webgazer.end?.(); } catch { }
      clearTimeout(recordingTimerRef.current);
    };
  }, []);

  const startCalibration = async () => {
    setCalibrationStatus("Menyiapkan kamera dan WebGazer...");
    if (!webgazerLoaded || !window.webgazer) {
      setCalibrationStatus("WebGazer belum termuat. Periksa koneksi internet lalu coba lagi.");
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setCalibrationStatus("Kamera membutuhkan HTTPS atau localhost. Jalankan frontend dengan npm start.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCalibrationStatus("Browser ini tidak mendukung akses kamera.");
      return;
    }
    setCalibrationStarted(true);
    setGazePointer({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    try {
      window.webgazer.params.camConstraints = {
        video: { facingMode: "user" },
        audio: false,
      };
      window.webgazer
        .setRegression("ridge")
        .setTracker("TFFacemesh")
        .showPredictionPoints(true)
        .showVideo(true);
      window.webgazer.setGazeListener((data) => {
        if (data) setGazePointer({ x: data.x, y: data.y });
      });

      window.webgazer.begin(() => {}).catch((error) => {
        if (!mountedRef.current) return;
        setCalibrationStarted(false);
        window.webgazer.clearGazeListener?.();
        const message = error?.name === "NotAllowedError"
          ? "Akses kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi."
          : error?.name === "NotReadableError"
            ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
            : "Kamera tidak dapat digunakan. Pastikan kamera aktif lalu coba lagi.";
        setCalibrationStatus(message);
      });
      setCalibrationStatus("Kamera aktif. Klik balon 3 kali. Ikuti urutan balon dari kiri atas.");
    } catch (error) {
      setCalibrationStarted(false);
      const message = error?.name === "NotAllowedError"
        ? "Akses kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi."
        : error?.name === "NotReadableError"
          ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi."
          : "Kamera tidak dapat digunakan. Pastikan kamera aktif lalu coba lagi.";
      setCalibrationStatus(message);
    }
  };

  const handleCalibrationClick = (event) => {
    if (!window.webgazer || calibrationReady) return;
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    const clickNumber = calibrationClicks + 1;
    window.webgazer.recordScreenPosition?.(event.clientX, event.clientY, "click");
    calibrationDataRef.current.push({
      point: calibrationIndex + 1,
      click: clickNumber,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      timestamp: Date.now(),
    });
    if (clickNumber === 3) {
      if (calibrationIndex === calibrationPoints.length - 1) {
        setCalibrationReady(true);
        setCalibrationStatus("Kalibrasi selesai. Tekan Lanjut.");
      } else {
        setCalibrationIndex((current) => current + 1);
        setCalibrationClicks(0);
        setCalibrationStatus(`Balon ${calibrationIndex + 2} dari ${calibrationPoints.length}. Klik 3 kali.`);
      }
    } else {
      setCalibrationClicks(clickNumber);
      setCalibrationStatus(`Balon ${calibrationIndex + 1} dari ${calibrationPoints.length}. Klik ${clickNumber + 1} dari 3.`);
    }
  };

  const startTracking = () => {
    if (!window.webgazer) return;
    gazeDataRef.current = [];
    setScene(4);
    setRecording(true);
  };

  const getGazeMetadata = () => {
    const screenWidth = window.innerWidth;
    const centerBoundaryX = screenWidth / 2;
    const leftSamples = gazeDataRef.current.filter((point) => point.contentField === "left").length;
    const rightSamples = gazeDataRef.current.filter((point) => point.contentField === "right").length;
    const totalSamples = leftSamples + rightSamples;

    return {
      stimulusLayout: { ...STIMULUS_LAYOUT },
      screenWidth,
      centerBoundaryX,
      divider: "vertical center of the viewport",
      left: {
        samples: leftSamples,
        percentage: totalSamples ? Number(((leftSamples / totalSamples) * 100).toFixed(2)) : 0,
      },
      right: {
        samples: rightSamples,
        percentage: totalSamples ? Number(((rightSamples / totalSamples) * 100).toFixed(2)) : 0,
      },
      dominantField: leftSamples === rightSamples ? "equal" : leftSamples > rightSamples ? "left" : "right",
      totalSamples,
    };
  };

  useEffect(() => {
    if (scene !== 4 || !recording || !videoRef.current || !window.webgazer) return undefined;
    const video = videoRef.current;
    let cancelled = false;

    const startRecording = async () => {
      await window.webgazer.resume?.();
      if (cancelled) return;
      window.webgazer.setGazeListener((data, timestamp) => {
        if (data) {
          const screenWidth = window.innerWidth;
          const centerBoundaryX = screenWidth / 2;
          gazeDataRef.current.push({
            x: data.x,
            y: data.y,
            timestamp,
            screenWidth,
            centerBoundaryX,
            contentField: data.x < centerBoundaryX ? "left" : "right",
          });
          setGazePointer({ x: data.x, y: data.y });
        }
      });
      video.currentTime = 0;
      await video.play();
      recordingTimerRef.current = setTimeout(() => {
        video.pause();
        window.webgazer.clearGazeListener?.();
        setRecording(false);
        setWatched(true);
      }, 15000);
    };

    startRecording().catch(() => {
      if (!cancelled) {
        setRecording(false);
        setCalibrationStatus("Tracking gagal dimulai. Pastikan kamera masih tersedia lalu coba lagi.");
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(recordingTimerRef.current);
      window.webgazer.clearGazeListener?.();
    };
  }, [scene, recording]);

  const finish = async () => {
    setAnalysisError("");
    const gazeSession = {
      durationSeconds: 15,
      stimulusLayout: { ...STIMULUS_LAYOUT },
      calibration: calibrationDataRef.current,
      gazeMetadata: getGazeMetadata(),
      gaze: gazeDataRef.current,
    };
    try {
      const result = await onFinish({
        done: true,
        method: "gaze",
        result: "Atensi visual terpantau baik. Disarankan observasi lanjutan.",
        answers: { gazeMetadata: gazeSession.gazeMetadata },
        gazeSession,
      });
      if (!result?.analysis) {
        throw new Error("Server tidak mengembalikan hasil analisis");
      }
      setAnalysis(result.analysis);
    } catch (error) {
      setAnalysisError(error.message || "Data gaze gagal disimpan dan dianalisis.");
    }
  };

  const nextButton = (disabled = false) => (
    <button onClick={() => setScene((current) => current + 1)} disabled={disabled} className="w-full h-10 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] transition-colors disabled:opacity-50">Lanjut</button>
  );

  const gazePointerElement = gazePointer && (
    <div
      aria-label="Pointer prediksi WebGazer"
      className="fixed z-[100] h-5 w-5 rounded-full border-2 border-white bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.35)] pointer-events-none"
      style={{ left: gazePointer.x - 10, top: gazePointer.y - 10 }}
    />
  );

  if (scene === 2) return (
    <div className="w-full flex-1 min-h-0 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col">
      {gazePointerElement}
      <button onClick={onBack} className="font-nunito text-[12px] text-[#3aa0a0] flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Kembali</button>
      <h2 className="font-nunito font-extrabold text-[18px] text-[#2c4f63]">Scene 2: Kalibrasi WebGazer</h2>
      {!calibrationStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
          <img src={ASSETS.balloon} alt="Ilustrasi balon kalibrasi" className="h-32 w-32 object-contain mb-4" />
          <p className="font-nunito text-[14px] leading-6 text-[#5c777c] max-w-md">Kalibrasi membantu WebGazer mengenali hubungan antara arah pandangan dan posisi di layar. Pastikan wajah terlihat jelas, lalu ikuti balon dengan pandangan dan klik balon yang muncul sebanyak tiga kali.</p>
          <p className="font-nunito text-[12px] text-[#5c777c] mt-3">Pointer WebGazer akan terlihat selama proses ini.</p>
        </div>
      ) : (
        <>
          <p className="font-nunito text-[13px] text-[#5c777c] mb-3">Ikuti urutan balon dari kiri atas. Klik balon yang terlihat sebanyak tiga kali pada setiap posisi.</p>
          <div className="relative flex-1 min-h-[260px] rounded-xl bg-[#f7fbfb] overflow-hidden">
            {calibrationReady ? <div className="absolute inset-0 flex items-center justify-center font-nunito text-[14px] font-bold text-[#3aa0a0]">Kalibrasi berhasil</div> : <button onClick={handleCalibrationClick} className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white shadow-md p-2" style={calibrationPoints[calibrationIndex]}><img src={ASSETS.balloon} alt="Balon kalibrasi" className="w-full h-full object-contain" /></button>}
          </div>
          <p className="font-nunito text-[12px] text-[#5c777c] my-3 text-center">{calibrationStatus}</p>
        </>
      )}
      <div className="flex flex-col gap-2"><button onClick={startCalibration} disabled={calibrationStarted && !calibrationReady} className="w-full h-10 rounded-xl ring-1 ring-[#6fcccb] text-[#3aa0a0] font-nunito font-bold text-[13px] disabled:opacity-50">{calibrationReady ? "Kalibrasi Selesai" : calibrationStarted ? "Kalibrasi sedang berlangsung" : "Mulai Kalibrasi"}</button>{nextButton(!calibrationReady)}</div>
    </div>
  );

  if (scene < 4) return (
    <div className="w-full flex-1 min-h-0 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col">
      <button onClick={onBack} className="font-nunito text-[12px] text-[#3aa0a0] flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Kembali</button>
      <div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-[#e4f7f6] px-3 py-1 font-nunito text-[11px] font-bold text-[#3aa0a0]">Scene {scene} dari 3</span></div>
      <h2 className="font-nunito font-extrabold text-[18px] text-[#2c4f63]">{scene === 1 ? "Scene 1: Persiapan" : "Scene 3: Mulai Pengamatan"}</h2>
      <div className="flex-1 flex items-center justify-center text-center px-4"><div><div className="mx-auto mb-4 h-24 w-24 rounded-full bg-[#fff5d9] flex items-center justify-center"><Camera size={38} className="text-[#e0a020]" /></div><p className="font-nunito text-[14px] leading-6 text-[#5c777c]">{scene === 1 ? "Pastikan anak duduk nyaman, wajah terlihat jelas, dan layar berada di depan anak. Pengamatan ini membantu melihat arah pandangan secara indikatif." : "WebGazer sudah dikalibrasi. Saat tombol ditekan, video akan langsung diputar dan koordinat pandangan direkam selama 15 detik."}</p></div></div>
      {scene === 1 ? nextButton() : <button onClick={startTracking} className="w-full h-10 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] flex items-center justify-center gap-2"><Play size={16} /> Mulai Tracking</button>}
    </div>
  );

  return (
    <div className="w-full flex-1 min-h-0 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col">
      {gazePointerElement}

      <button
        onClick={onBack}
        className="font-nunito text-[12px] text-[#3aa0a0] flex items-center gap-1 mb-2 shrink-0"
      >
        <ArrowLeft size={14} /> Kembali
      </button>

      <h2 className="font-nunito font-extrabold text-[16px] text-[#2c4f63] mb-1 shrink-0">
        {definition.title}
      </h2>

      <p className="font-nunito text-[12px] text-[#5c777c] mb-3 shrink-0">
        {definition.description}
      </p>

      {/* VIDEO */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-black mb-3">
        <video
          className="w-full h-full"
          ref={videoRef}
          src={ASSETS.eyeVideo}
          title="Gaze Screening Video"
          controls={false}
          playsInline
          allowFullScreen
        />
      </div>

      <p className="font-nunito text-[12px] text-[#5c777c] mb-3 shrink-0 text-center">{recording ? "Sedang merekam koordinat pandangan..." : watched ? "Perekaman 15 detik selesai." : "Menyiapkan perekaman..."}</p>

      {/* BUTTON */}
      {analysis && (
        <div className="mb-3 rounded-xl bg-[#eef8f7] p-3 font-nunito text-[12px] text-[#2c4f63]">
          <p className="font-bold">Hasil analisis otomatis</p>
          <p>Sosial: {analysis.features?.pct_sosial ?? 0}% | Geometris: {analysis.features?.pct_geometris ?? 0}%</p>
          <p className="mt-1 font-bold">{analysis.classification?.result_label}</p>
          <p className="mt-1 text-[11px] text-[#5c777c]">Data tersimpan ke akun Anda. Hasil ini bukan diagnosis.</p>
        </div>
      )}
      {analysisError && (
        <p className="mb-3 rounded-xl bg-[#ffeaea] p-3 text-center font-nunito text-[12px] text-[#b33a3a]">
          {analysisError}
        </p>
      )}
      <button
        onClick={finish}
        disabled={!watched || saving || recording}
        className="w-full h-10 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
      >
        <Check size={17} /> Simpan & Analisis
      </button>
      <p className="mt-2 text-center font-nunito text-[12px] text-[#3aa0a0]">{saving && <Loader2 size={13} className="inline animate-spin" />} Data akan dianalisis dan disimpan otomatis</p>

    </div>
  );
};

const MChatScreening = ({ definition, onBack, onFinish, saving }) => {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const allAnswered = Object.keys(answers).length === definition.questions.length;

  const compute = () => {
    let riskCount = 0;
    definition.questions.forEach((q) => {
      if (answers[q.id] === q.risk) riskCount += 1;
    });
    let level = "Risiko Rendah";
    if (riskCount >= 6) level = "Risiko Tinggi";
    else if (riskCount >= 3) level = "Risiko Sedang";
    const res = {
      done: true,
      method: "mchat",
      score: riskCount,
      result: `${level} (${riskCount}/${definition.questions.length} indikator)`,
      answers,
    };
    setResult(res);
  };

  return (
<div className="w-full flex-1 min-h-0 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col overflow-hidden">      <button onClick={onBack} className="font-nunito text-[13px] text-[#3aa0a0] flex items-center gap-1 mb-4">
        <ArrowLeft size={15} /> Kembali
      </button>
      <h2 className="font-nunito font-extrabold text-[18px] text-[#2c4f63] mb-1">
        Screening M-CHAT
      </h2>
      <p className="font-nunito text-[13px] text-[#5c777c] mb-5">
        Jawab pertanyaan berikut sesuai kondisi anak. Hasil bersifat indikatif, bukan diagnosa medis.
      </p>

      {!result ? (
        <>
<div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
              {definition.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl bg-[#f7fbfb] p-3">
                <p className="font-nunito text-[14px] text-[#2c4f63] mb-2">
                  {i + 1}. {q.text}
                </p>
                <div className="flex gap-2">
                  {["yes", "no"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                      className={`flex-1 py-2 rounded-lg font-nunito font-bold text-[13px] transition-all ${
                        answers[q.id] === val
                          ? val === "yes"
                            ? "bg-[#6fcccb] text-white"
                            : "bg-[#e5a3a3] text-white"
                          : "bg-white ring-1 ring-[#e2ebec] text-[#5c777c] hover:ring-[#bfe6e6]"
                      }`}
                    >
                      {val === "yes" ? "Ya" : "Tidak"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={compute}
            disabled={!allAnswered}
            className="mt-5 w-full h-11 rounded-xl bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[15px] transition-colors disabled:opacity-50"
          >
            Lihat Hasil ({Object.keys(answers).length}/{definition.questions.length})
          </button>
        </>
      ) : (
        <div className="text-center py-4 animate-fadeIn">
          <div
            className={`inline-flex h-16 w-16 rounded-full items-center justify-center mb-3 ${
              result.score >= 6 ? "bg-[#ffe0e0]" : result.score >= 3 ? "bg-[#fff2d6]" : "bg-[#e3f6e8]"
            }`}
          >
            {result.score >= 3 ? (
              <X size={30} className={result.score >= 6 ? "text-[#eb5757]" : "text-[#e0a020]"} />
            ) : (
              <Check size={30} className="text-[#3ea45f]" />
            )}
          </div>
          <h3 className="font-nunito font-extrabold text-[18px] text-[#2c4f63]">{result.result}</h3>
          <p className="font-nunito text-[13px] text-[#5c777c] mt-2 max-w-sm mx-auto">
            Hasil ini hanya gambaran awal. Untuk kepastian, konsultasikan dengan profesional.
          </p>
          <button
            onClick={() => onFinish(result)}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            <Home size={16} /> Simpan & Ke Beranda
          </button>
        </div>
      )}
    </div>
  );
};

const ScreeningPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, saveAutismTest } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const mode = location.pathname.endsWith("/gaze") ? "gaze" : "mchat";

  useEffect(() => {
    fetch(`${API}/screening/definitions`)
      .then((response) => response.json())
      .then(setDefinitions)
      .catch(() => setDefinitions([]));
  }, []);

  const gazeDefinition = definitions.find((item) => item.method === "gaze");
  const mchatDefinition = definitions.find((item) => item.method === "mchat");

  const handleFinish = async (testData) => {
    setSaving(true);
    let sessionResponse = null;
    try {
      if (user) {
        const definition = testData.method === "gaze" ? gazeDefinition : mchatDefinition;
        sessionResponse = await fetch(`${API}/screening/sessions`, {
          ...authConfig(token),
          method: "POST",
          headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            definition_id: definition?.id,
            answers: testData.answers || {},
            score: testData.score,
            result: testData.result,
            gaze_session: testData.gazeSession,
          }),
        });
        if (!sessionResponse.ok) {
          throw new Error("Gagal menyimpan sesi screening");
        }
        sessionResponse = await sessionResponse.json();
        await saveAutismTest({ ...testData, result: sessionResponse.result || testData.result });
        toast({
          title: "Data screening diperbarui",
          description: "Hasil terbaru telah disimpan sebagai data terkini anak.",
        });
      }
    } catch (error) {
      if (testData.method === "gaze") {
        throw error;
      }
    } finally {
      setSaving(false);
      if (user && testData.method !== "gaze") {
        setTimeout(() => navigate("/"), 900);
      } else if (!user) {
        navigate("/");
      }
    }
    return sessionResponse;
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f7] overflow-hidden">
      <Header />
<main className="flex-1 min-h-0 w-full px-4 md:px-6 py-3 flex flex-col overflow-hidden">


        {mode === "gaze" && gazeDefinition && (
          <GazeScreening definition={gazeDefinition} onBack={() => navigate("/")} onFinish={handleFinish} saving={saving} />
        )}
        {mode === "mchat" && mchatDefinition && (
          <MChatScreening definition={mchatDefinition} onBack={() => navigate("/")} onFinish={handleFinish} saving={saving} />
        )}
        {!gazeDefinition && !mchatDefinition && (
          <div className="bg-white rounded-2xl p-6 text-center font-nunito text-[14px] text-[#5c777c]">
            Memuat screening...
          </div>
        )}
      </main>
      <Toaster />
      {/* <Footer /> */}
    </div>
  );
};

export default ScreeningPage;
