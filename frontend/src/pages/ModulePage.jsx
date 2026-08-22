import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Play, Video } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ASSETS } from "../mock";
import { API } from "../lib/api";

const ModulePage = () => {
  const { categoryId, courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/courses?category_id=${categoryId}`).then((response) => {
        if (!response.ok) throw new Error("Gagal memuat course");
        return response.json();
      }),
      fetch(`${API}/courses/${courseId}/chapters`).then((response) => {
        if (!response.ok) throw new Error("Gagal memuat module");
        return response.json();
      }),
    ])
      .then(([courses, courseChapters]) => {
        const selectedCourse = courses.find((item) => item.id === courseId);
        if (!selectedCourse) throw new Error("Course tidak ditemukan");
        setCourse(selectedCourse);
        setChapters(courseChapters);
      })
      .catch(() => setError("Module belum dapat dimuat."));
  }, [categoryId, courseId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="font-nunito text-[#eb5757]">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2c4f63] px-4 py-2 font-nunito text-sm font-bold text-white"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return <div className="min-h-screen flex items-center justify-center font-nunito">Memuat module...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-7">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 font-nunito text-sm font-bold text-[#3aa0a0] hover:text-[#2c7d7d]"
        >
          <ArrowLeft size={17} /> Kembali ke daftar course
        </button>

        <header className="relative overflow-hidden rounded-3xl bg-[#2c4f63] px-6 py-7 md:px-9 md:py-9 shadow-[0_14px_35px_-18px_rgba(44,79,99,0.8)]">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-2 font-nunito text-xs font-extrabold uppercase tracking-[0.18em] text-[#8fe2dc]">
              Module Pembelajaran
            </p>
            <h1 className="font-fredoka text-3xl font-semibold leading-tight text-white md:text-4xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-xl font-nunito text-sm leading-relaxed text-white/80">
              Pilih materi bergambar dan video, lalu lanjutkan belajar bersama karakter AutiGaze.
            </p>
          </div>
          <img
            src={course.image}
            alt=""
            className="absolute -right-8 -bottom-10 h-44 w-56 rotate-3 rounded-2xl object-cover opacity-35 md:h-56 md:w-72"
          />
        </header>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-nunito text-xl font-extrabold text-[#2c4f63]">Pilih materi</h2>
            <p className="mt-1 font-nunito text-sm text-[#719095]">{chapters.length} bagian pembelajaran tersedia</p>
          </div>
          <div className="hidden items-center gap-2 font-nunito text-xs font-bold text-[#719095] sm:flex">
            <BookOpen size={16} /> Belajar bertahap
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {chapters.map((chapter, chapterIndex) => (
            <section key={chapter.id} className="rounded-2xl bg-white p-4 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eafafa] font-fredoka text-lg font-bold text-[#3aa0a0]">
                  {String(chapterIndex + 1).padStart(2, "0")}
                </span>
                <h3 className="font-nunito text-lg font-extrabold text-[#2c4f63]">{chapter.title}</h3>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {chapter.modules.map((module, moduleIndex) => (
                  <article key={module.id} className="overflow-hidden rounded-2xl border border-[#e1eeee] bg-[#fbfdfd]">
                    <div className="grid grid-cols-2 gap-2 bg-[#edf8f7] p-2">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#dceeed]">
                        {module.contentType === "image" && module.mediaUrl ? <img src={module.mediaUrl} alt={`Gambar ${module.name}`} className="h-full w-full object-cover" /> : <img src={course.image} alt={`Gambar ${module.name}`} className="h-full w-full object-cover" />}
                        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 font-nunito text-[10px] font-extrabold text-[#3aa0a0]">GAMBAR</span>
                      </div>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#dceeed]">
                        <video src={module.contentType === "video" && module.mediaUrl ? module.mediaUrl : ASSETS.eyeVideo} controls preload="metadata" className="h-full w-full object-cover" aria-label={`Video ${module.name}`} />
                        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 font-nunito text-[10px] font-extrabold text-[#3aa0a0]"><Video size={11} /> VIDEO</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="font-nunito text-[11px] font-bold uppercase tracking-wider text-[#8aa0a3]">Materi {moduleIndex + 1}</p>
                      <h4 className="mt-1 font-fredoka text-xl font-semibold text-[#2c4f63]">{module.name}</h4>
                      <p className="mt-1 line-clamp-2 font-nunito text-sm leading-relaxed text-[#719095]">{module.description || "Pelajari materi ini dengan gambar, video, dan karakter interaktif."}</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/lesson/${categoryId}/${courseId}?module=${module.id}`)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6fcccb] px-4 py-2.5 font-nunito text-sm font-extrabold text-white shadow-sm transition hover:bg-[#4eb8b7]"
                      >
                        <Play size={15} fill="currentColor" /> Mulai belajar <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModulePage;
