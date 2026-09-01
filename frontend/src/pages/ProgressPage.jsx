import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Cell,
} from "recharts";
import {
  BookOpen,
  CheckCircle2,
  Star,
  Flame,
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChildAvatar from "../components/ChildAvatar";
import { useChild } from "../context/ChildContext";
import { useAuth } from "../context/AuthContext";
import { API, authConfig } from "../lib/api";
import { generateProgressReport } from "../utils/generateReport";
import { Download } from "lucide-react";

const BAR_COLORS = ["#6fcccb", "#f6b93b", "#eb8f8f", "#8fce9a"];

const EMPTY_PROGRESS = {
  stats: { totalMateri: 0, selesai: 0, moduleSelesai: 0, subModuleSelesai: 0, rataNilai: 0, streak: 0 },
  weekly: [],
  categoryScores: [],
  focusLevel: 0,
  screening: null,
  completedMaterials: [],
  ai: {
    focusScore: 0,
    focusLabel: "Belum ada data",
    focusSummary: "Selesaikan materi untuk mulai membentuk ringkasan fokus.",
    developmentSummary: "Data perkembangan akan muncul setelah aktivitas belajar tercatat.",
    strengths: [],
    improvements: [],
    recommendations: [],
  },
};

const StatCard = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_22px_-16px_rgba(80,140,150,0.8)] flex items-center gap-3">
    <div
      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: tint.bg }}
    >
      <Icon size={22} style={{ color: tint.fg }} />
    </div>
    <div className="leading-tight">
      <div className="font-fredoka font-bold text-[20px] text-[#2c5f66]">
        {value}
      </div>
      <div className="font-nunito text-[12px] text-[#8aa0a3]">{label}</div>
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="font-nunito font-extrabold text-[16px] text-[#2c4f63] mb-3">
    {children}
  </h2>
);

const ProgressPage = () => {
  const { child } = useChild();
  const { token } = useAuth();
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [range, setRange] = useState("7d");
  const [progressError, setProgressError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const lineChartRef = useRef(null);
  const focusChartRef = useRef(null);
  const { stats, weekly, categoryScores, completedMaterials, ai } = progress;
  const completedByChapter = completedMaterials.reduce((groups, material) => {
    const chapterName = material.chapter || "Chapter tanpa nama";
    if (!groups[chapterName]) groups[chapterName] = [];
    groups[chapterName].push(material);
    return groups;
  }, {});

  useEffect(() => {
    if (!token) return;
    setProgressError("");
    fetch(`${API}/progress?range=${range}`, authConfig(token))
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat progress");
        return response.json();
      })
      .then((data) => setProgress((current) => ({ ...current, ...data, ai: { ...current.ai, ...(data.ai || {}) } })))
      .catch(() => setProgressError("Data grafik belum dapat dimuat."));
  }, [token, range]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/screening/summary`, authConfig(token))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((screening) => setProgress((current) => ({ ...current, screening })))
      .catch(() => {});
  }, [token]);
  const focusScore = progress.focusLevel ?? 0;
  const focusData = [{ name: "fokus", value: focusScore, fill: "#6fcccb" }];
  const focusLabel = focusScore >= 80 ? "Fokus baik" : focusScore >= 50 ? "Fokus perlu ditingkatkan" : "Sering kehilangan fokus";

  const handleDownload = async () => {
    setDownloadError("");
    const chartImages = {};
    try {
      if (lineChartRef.current) chartImages.line = (await html2canvas(lineChartRef.current, { backgroundColor: "#ffffff", scale: 2 })).toDataURL("image/png");
      if (focusChartRef.current) chartImages.focus = (await html2canvas(focusChartRef.current, { backgroundColor: "#ffffff", scale: 2 })).toDataURL("image/png");
    } catch {
      // Generate the report even if a browser cannot capture SVG charts.
    }
    try {
      await generateProgressReport(child, progress, chartImages);
    } catch {
      setDownloadError("Laporan belum dapat diunduh. Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Child header */}
        <div className="bg-gradient-to-br from-[#7fd8d3] to-[#66c7c8] rounded-3xl p-5 md:p-6 flex items-center gap-4 shadow-[0_12px_30px_-16px_rgba(90,180,180,0.9)]">
          <ChildAvatar name={child.fullName} size={68} />
          <div className="text-white flex-1 min-w-0">
            <h1 className="font-fredoka font-semibold text-[24px] leading-tight">
              Progress {child.nickname}
            </h1>
            <p className="font-nunito text-white/90 text-[13px]">
              {child.fullName} • {child.age} tahun • {child.grade}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="shrink-0 inline-flex items-center gap-2 bg-white text-[#2c7d7d] hover:bg-[#f2fbfb] font-nunito font-bold text-[13px] md:text-[14px] px-4 md:px-5 py-2.5 rounded-xl shadow transition-colors"
          >
            <Download size={17} /> Unduh Laporan PDF
          </button>
          {downloadError && <p className="absolute right-5 top-full mt-2 font-nunito text-xs text-[#eb5757]">{downloadError}</p>}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Total Materi" value={stats.totalMateri} tint={{ bg: "#e2f3f3", fg: "#3aa0a0" }} />
          <StatCard icon={CheckCircle2} label="Materi Selesai" value={stats.selesai} tint={{ bg: "#e3f6e8", fg: "#3ea45f" }} />
          <StatCard icon={BookOpen} label="Module Selesai" value={progress.moduleSelesai || 0} tint={{ bg: "#eaf0ff", fg: "#5875c7" }} />
          <StatCard icon={CheckCircle2} label="Sub Module Selesai" value={progress.subModuleSelesai || 0} tint={{ bg: "#f2eaff", fg: "#9166bd" }} />
          <StatCard icon={Star} label="Rata-rata Nilai" value={stats.rataNilai} tint={{ bg: "#fff2d6", fg: "#e0a020" }} />
          <StatCard icon={Flame} label="Hari Streak" value={stats.streak} tint={{ bg: "#ffe6da", fg: "#ff7a3d" }} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Learning trend */}
          <div ref={lineChartRef} className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>Grafik Pembelajaran</SectionTitle>
              <div className="flex items-center gap-1 rounded-lg bg-[#edf6f6] p-1" role="group" aria-label="Rentang grafik">
                {[{ id: "7d", label: "7 Hari" }, { id: "1m", label: "1 Bulan" }, { id: "1y", label: "1 Tahun" }].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRange(option.id)}
                    className={`rounded-md px-3 py-1.5 font-nunito text-xs font-bold transition-colors ${range === option.id ? "bg-white text-[#2c7d7d] shadow-sm" : "text-[#719095] hover:text-[#2c7d7d]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {progressError && <p className="mb-2 font-nunito text-xs text-[#eb5757]">{progressError}</p>}
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weekly} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFokus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6fcccb" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6fcccb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f6b93b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f6b93b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f2" vertical={false} />
                <XAxis dataKey="week" interval={range === "1m" ? 2 : 0} tick={{ fontSize: 12, fill: "#8aa0a3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8aa0a3" }} axisLine={false} tickLine={false} domain={[0, "auto"]} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2ebec", fontFamily: "Nunito" }} />
                <Area type="monotone" dataKey="fokus" name="Kehilangan fokus" stroke="#4fb3b2" strokeWidth={3} fill="url(#gFokus)" />
                <Area type="monotone" dataKey="penyelesaian" name="Module selesai" stroke="#e0a020" strokeWidth={3} fill="url(#gSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 px-1">
              <span className="flex items-center gap-2 font-nunito text-[12px] text-[#5c777c]"><span className="h-3 w-3 rounded-full bg-[#4fb3b2]" /> Kehilangan fokus</span>
              <span className="flex items-center gap-2 font-nunito text-[12px] text-[#5c777c]"><span className="h-3 w-3 rounded-full bg-[#e0a020]" /> Module selesai</span>
            </div>
          </div>

          {/* Focus ring */}
          <div ref={focusChartRef} className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col">
            <SectionTitle>Tingkat Fokus</SectionTitle>
            <div className="relative flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={focusData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "#eef4f4" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-fredoka font-bold text-[34px] text-[#2c5f66]">{focusScore}%</span>
                <span className="font-nunito text-[12px] text-[#8aa0a3]">Fokus rata-rata</span>
              </div>
            </div>
            <p className="font-nunito text-[12px] text-center text-[#4c9a9a] font-semibold mt-1">
              {focusLabel}
            </p>
          </div>
        </div>

        {/* Nilai per kategori */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)]">
          <SectionTitle>Nilai per Kategori</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryScores} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f2" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#5c777c" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#8aa0a3" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip cursor={{ fill: "#f2fafa" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2ebec", fontFamily: "Nunito" }} />
              <Bar dataKey="nilai" radius={[10, 10, 0, 0]} barSize={54}>
                {categoryScores.map((entry, i) => (
                  <Cell key={entry.name} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Analysis */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#eefafa] to-[#e5f4f6] ring-1 ring-[#cdeced]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-[#6fcccb] flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h2 className="font-nunito font-extrabold text-[17px] text-[#2c4f63]">
              Analisis AI — Fokus & Perkembangan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-[#3aa0a0]" />
                <span className="font-nunito font-bold text-[14px] text-[#2c5f66]">Tingkat Fokus</span>
              </div>
              <p className="font-nunito text-[13px] text-[#5c777c] leading-relaxed">{ai.focusSummary}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-[#3aa0a0]" />
                <span className="font-nunito font-bold text-[14px] text-[#2c5f66]">Perkembangan Anak</span>
              </div>
              <p className="font-nunito text-[13px] text-[#5c777c] leading-relaxed">{ai.developmentSummary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4">
              <span className="font-nunito font-bold text-[13px] text-[#3ea45f]">Kelebihan</span>
              <ul className="mt-2 space-y-1.5">
                {ai.strengths.map((s, i) => (
                  <li key={i} className="font-nunito text-[12.5px] text-[#5c777c] flex gap-2">
                    <CheckCircle2 size={15} className="text-[#3ea45f] shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl p-4">
              <span className="font-nunito font-bold text-[13px] text-[#e0a020]">Perlu Ditingkatkan</span>
              <ul className="mt-2 space-y-1.5">
                {ai.improvements.map((s, i) => (
                  <li key={i} className="font-nunito text-[12.5px] text-[#5c777c] flex gap-2">
                    <Target size={15} className="text-[#e0a020] shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl p-4">
              <span className="font-nunito font-bold text-[13px] text-[#3aa0a0]">Rekomendasi</span>
              <ul className="mt-2 space-y-1.5">
                {ai.recommendations.map((s, i) => (
                  <li key={i} className="font-nunito text-[12.5px] text-[#5c777c] flex gap-2">
                    <Lightbulb size={15} className="text-[#3aa0a0] shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="font-nunito text-[11px] text-[#9fb2b3] mt-4 italic">
            *Analisis dibuat otomatis sebagai gambaran (data contoh).
          </p>
        </div>

        {/* Completed materials */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)]">
          <SectionTitle>Materi yang Diselesaikan</SectionTitle>
          <div className="space-y-2">
            {Object.entries(completedByChapter).map(([chapterName, materials]) => (
              <details key={chapterName} className="group rounded-xl border border-[#e1eeee] bg-[#fbfdfd]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-nunito font-extrabold text-[14px] text-[#2c4f63]">
                  <span>{chapterName}</span>
                  <span className="shrink-0 rounded-full bg-[#eafafa] px-3 py-1 text-[12px] text-[#3aa0a0]">
                    {materials.length} module
                  </span>
                </summary>
                <div className="border-t border-[#e1eeee] px-4">
                  {materials.map((material) => (
                    <div key={material.id} className="flex items-center gap-3 border-b border-[#f0f4f4] py-3 last:border-b-0">
                      <CheckCircle2 size={20} className="shrink-0 text-[#3ea45f]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-nunito text-[14px] font-bold text-[#2c4f63]">{material.title}</div>
                        <div className="font-nunito text-[12px] text-[#8aa0a3]">{material.course || "Course"} • {material.date}</div>
                      </div>
                      <div className="shrink-0 rounded-full bg-[#eafafa] px-3 py-1 font-nunito text-[13px] font-bold text-[#3aa0a0]">Selesai</div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
            {!completedMaterials.length && (
              <p className="py-3 font-nunito text-sm text-[#8aa0a3]">Belum ada materi yang diselesaikan.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProgressPage;
