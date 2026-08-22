import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { API } from "../lib/api";

const VISIBLE = 3;

const CourseCard = ({ course, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex-1 min-w-0 rounded-xl overflow-hidden bg-white ring-1 ring-[#e7eef0] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
  >
    <div className="aspect-[16/10] overflow-hidden">
      <img
        src={course.image}
        alt={course.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>
    <div className="absolute bottom-0 left-0 right-0 bg-[#6fcccb]/90 backdrop-blur-sm px-3 py-2">
      <span className="font-nunito italic font-bold text-white text-[13px] leading-tight line-clamp-2 drop-shadow">
        {course.title}
      </span>
    </div>
  </button>
);

const CategoryRow = ({ category }) => {
  const navigate = useNavigate();
  const courses = category.courses || [];
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, courses.length - VISIBLE);

  const visible = courses.slice(start, start + VISIBLE);
  while (visible.length < VISIBLE && courses.length >= VISIBLE) {
    visible.push(courses[visible.length]);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-nunito italic font-extrabold text-[18px] text-[#2c4f63]">
          {category.title}
        </h2>
        <button
          onClick={() => navigate(`/course/${category.id}`)}
          className="font-nunito text-[13px] text-[#3aa0a0] hover:text-[#2c7d7d] font-semibold flex items-center gap-1 transition-colors"
        >
          Selengkapnya <ArrowRight size={14} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-[0_10px_28px_-18px_rgba(80,140,150,0.7)] flex items-center gap-3">
        <button
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          disabled={start === 0}
          className="shrink-0 h-9 w-9 rounded-full bg-white ring-1 ring-[#e2ebec] shadow flex items-center justify-center text-[#4c9a9a] hover:bg-[#eafafa] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 grid grid-cols-3 gap-4 min-w-0">
          {visible.map((c, i) => (
            <CourseCard
              key={`${category.id}-${c.id}-${i}`}
              course={c}
              onClick={() => navigate(`/course/${category.id}/${c.id}`)}
            />
          ))}
        </div>

        <button
          onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
          disabled={start >= maxStart}
          className="shrink-0 h-9 w-9 rounded-full bg-white ring-1 ring-[#e2ebec] shadow flex items-center justify-center text-[#4c9a9a] hover:bg-[#eafafa] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
};

const CoursePage = () => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat kategori");
        return response.json();
      })
      .then(async (items) => {
        const withCourses = await Promise.all(
          items.map(async (category) => {
            const response = await fetch(`${API}/courses?category_id=${category.id}`);
            if (!response.ok) throw new Error("Gagal memuat course");
            return { ...category, courses: await response.json() };
          }),
        );
        setCategories(withCourses);
      })
      .catch(() => setError("Data course belum dapat dimuat."));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-10">
        {error && <p className="font-nunito text-[#eb5757]">{error}</p>}
        {!error && categories.length === 0 && (
          <p className="font-nunito text-[#8aa0a3]">Memuat course...</p>
        )}
        {categories.map((cat) => <CategoryRow key={cat.id} category={cat} />)}
      </main>
      <Footer />
    </div>
  );
};

export default CoursePage;
