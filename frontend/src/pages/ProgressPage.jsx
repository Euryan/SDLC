import React, { useEffect, useState } from "react";
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
  stats: { totalMateri: 0, selesai: 0, rataNilai: 0, streak: 0 },
  weekly: [],
  categoryScores: [],
  focusLevel: 0,
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
  const { stats, weekly, categoryScores, completedMaterials, ai } = progress;

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/progress`, authConfig(token))
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat progress");
        return response.json();
      })
      .then((data) => setProgress((current) => ({ ...current, ...data, ai: { ...current.ai, ...(data.ai || {}) } })))
      .catch(() => {});
  }, [token]);
  const focusData = [{ name: "fokus", value: ai.focusScore, fill: "#6fcccb" }];

  const handleDownload = () => {
    generateProgressReport(child, progress);
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
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Total Materi" value={stats.totalMateri} tint={{ bg: "#e2f3f3", fg: "#3aa0a0" }} />
          <StatCard icon={CheckCircle2} label="Materi Selesai" value={stats.selesai} tint={{ bg: "#e3f6e8", fg: "#3ea45f" }} />
          <StatCard icon={Star} label="Rata-rata Nilai" value={stats.rataNilai} tint={{ bg: "#fff2d6", fg: "#e0a020" }} />
          <StatCard icon={Flame} label="Hari Streak" value={stats.streak} tint={{ bg: "#ffe6da", fg: "#ff7a3d" }} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Learning trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)]">
            <SectionTitle>Grafik Pembelajaran</SectionTitle>
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
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#8aa0a3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8aa0a3" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2ebec", fontFamily: "Nunito" }} />
                <Area type="monotone" dataKey="fokus" name="Fokus (%)" stroke="#4fb3b2" strokeWidth={3} fill="url(#gFokus)" />
                <Area type="monotone" dataKey="penyelesaian" name="Penyelesaian (%)" stroke="#e0a020" strokeWidth={3} fill="url(#gSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 px-1">
              <span className="flex items-center gap-2 font-nunito text-[12px] text-[#5c777c]"><span className="h-3 w-3 rounded-full bg-[#4fb3b2]" /> Fokus</span>
              <span className="flex items-center gap-2 font-nunito text-[12px] text-[#5c777c]"><span className="h-3 w-3 rounded-full bg-[#e0a020]" /> Penyelesaian</span>
            </div>
          </div>

          {/* Focus ring */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex flex-col">
            <SectionTitle>Tingkat Fokus</SectionTitle>
            <div className="relative flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={focusData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "#eef4f4" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-fredoka font-bold text-[34px] text-[#2c5f66]">{ai.focusScore}%</span>
                <span className="font-nunito text-[12px] text-[#8aa0a3]">Fokus rata-rata</span>
              </div>
            </div>
            <p className="font-nunito text-[12px] text-center text-[#4c9a9a] font-semibold mt-1">
              {ai.focusLabel}
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
          <div className="divide-y divide-[#f0f4f4]">
            {completedMaterials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <CheckCircle2 size={20} className="text-[#3ea45f] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-nunito font-bold text-[14px] text-[#2c4f63] truncate">{m.title}</div>
                  <div className="font-nunito text-[12px] text-[#8aa0a3]">{m.category} • {m.date}</div>
                </div>
                <div className="shrink-0 px-3 py-1 rounded-full bg-[#eafafa] font-nunito font-bold text-[13px] text-[#3aa0a0]">
                  {m.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProgressPage;
