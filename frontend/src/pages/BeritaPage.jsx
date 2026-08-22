import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsCard from "../components/NewsCard";
import NewsModal from "../components/NewsModal";
import { API } from "../lib/api";

const BeritaPage = () => {
  const [activeNews, setActiveNews] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetch(`${API}/news`)
      .then((response) => response.json())
      .then(setNews)
      .catch(() => setNews([]));
  }, []);

  const openNews = (news) => {
    setActiveNews(news);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6">
        <h1 className="font-nunito font-extrabold text-[22px] text-[#2c4f63] mb-5">
          Berita Autisme
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((n) => (
            <NewsCard key={n.id} news={n} onRead={openNews} />
          ))}
        </div>
      </main>

      <NewsModal news={activeNews} open={modalOpen} onOpenChange={setModalOpen} />

      <Footer />
    </div>
  );
};

export default BeritaPage;
