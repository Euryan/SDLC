import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Check, ArrowRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsCard from "../components/NewsCard";
import NewsModal from "../components/NewsModal";
import CompanionChatWidget from "../components/CompanionChatWidget";
import { ASSETS, USER, STREAK, HOME_MODULES, NEWS } from "../mock";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const getLastSevenDays = (completed = []) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { done: Boolean(completed[index]), label: DAY_LABELS[date.getDay()] };
  });

const HeroBanner = ({ streak }) => (
  <div className="relative rounded-3xl bg-gradient-to-br from-[#7fd8d3] to-[#66c7c8] px-6 md:px-8 py-6 overflow-hidden shadow-[0_12px_30px_-14px_rgba(90,180,180,0.9)]">
    <div className="relative z-10 max-w-[62%]">
      <h1 className="font-fredoka font-semibold text-white text-[26px] md:text-[32px] leading-tight drop-shadow-sm">
        Halo Selamat Datang{" "}
        <span className="text-[#1b4d8f]">{USER.name}!</span>
      </h1>
      <p className="font-nunito italic text-white/90 text-[14px] md:text-[15px] mb-4">
        Mari Kita Lanjutkan Pembelajaran Kita!
      </p>

      {/* Streak card */}
      <div className="bg-white rounded-2xl p-3 md:p-4 inline-flex flex-col gap-3 shadow-md w-full max-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#ffece0] flex items-center justify-center">
            <Flame size={24} className="text-[#ff7a3d]" fill="#ff9a5d" />
          </div>
          <div className="leading-none">
            <div className="font-fredoka font-bold text-[22px] text-[#2c5f66]">
              {streak.days}
            </div>
            <div className="font-nunito text-[11px] text-[#8aa0a3]">
              hari streak
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {streak.week.map(({ done, label }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? "bg-[#57c778] text-white"
                    : "bg-[#e7ecec] text-transparent"
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </div>
              <span className="font-nunito text-[9px] text-[#9fb2b3]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Sticker */}
    <img
      src={ASSETS.sticker}
      alt="Terima kasih"
      className="absolute right-2 md:right-6 bottom-0 h-[150px] md:h-[230px] object-contain z-10 pointer-events-none"
    />
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeNews, setActiveNews] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [streak, setStreak] = useState(() => ({
    ...STREAK,
    week: getLastSevenDays(STREAK.week),
  }));

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/progress`, authConfig(token))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((progress) => setStreak({
        days: progress.stats?.streak || 0,
        week: (progress.weekly || []).slice(-7).map((item) => ({
          done: item.penyelesaian > 0,
          label: item.week?.split(" ")[0] || "",
        })),
      }))
      .catch(() => {});
  }, [token]);

  const openNews = (news) => {
    setActiveNews(news);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <HeroBanner streak={streak} />

        {/* Module Pembelajaran */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-nunito font-extrabold text-[18px] text-[#2c4f63]">
              Module Pembelajaran:
            </h2>
            <button
              onClick={() => navigate("/course")}
              className="font-nunito text-[13px] text-[#3aa0a0] hover:text-[#2c7d7d] font-semibold flex items-center gap-1 transition-colors"
            >
              Selengkapnya <ArrowRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_10px_30px_-18px_rgba(80,140,150,0.7)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {HOME_MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    navigate(m.route || (m.categoryId ? `/course/${m.categoryId}` : "/course"))
                  }
                  className="group relative rounded-2xl h-28 md:h-32 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
                  style={{ backgroundColor: m.color }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="font-fredoka font-semibold text-white text-[16px] drop-shadow">
                      {m.title}
                    </div>
                    <div className="font-nunito text-white/90 text-[11px] flex items-center gap-1">
                      {m.desc}
                      <ArrowRight
                        size={12}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Berita Autisme */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-nunito font-extrabold text-[18px] text-[#2c4f63]">
              Berita Autisme:
            </h2>
            <button
              onClick={() => navigate("/berita")}
              className="font-nunito text-[13px] text-[#3aa0a0] hover:text-[#2c7d7d] font-semibold flex items-center gap-1 transition-colors"
            >
              Selengkapnya <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {NEWS.map((n) => (
              <NewsCard key={n.id} news={n} onRead={openNews} />
            ))}
          </div>
        </section>
      </main>

      <NewsModal news={activeNews} open={modalOpen} onOpenChange={setModalOpen} />

      <Footer />
      <CompanionChatWidget />
    </div>
  );
};

export default HomePage;
