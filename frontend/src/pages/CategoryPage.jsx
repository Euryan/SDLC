import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { API } from "../lib/api";

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/categories`).then((response) => response.json()),
      fetch(`${API}/courses?category_id=${categoryId}`).then((response) => response.json()),
    ]).then(([categories, courseItems]) => {
      setCategory(categories.find((item) => item.id === categoryId) || categories[0]);
      setCourses(courseItems);
    });
  }, [categoryId]);

  if (!category) {
    return <div className="min-h-screen flex items-center justify-center font-nunito">Memuat course...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_12px_30px_-18px_rgba(80,140,150,0.7)]">
          <h1 className="font-nunito italic font-extrabold text-[22px] text-[#2c4f63] mb-6">
            {category.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => navigate(`/course/${category.id}/${course.id}`)}
                className="group text-left"
              >
                <div className="rounded-xl overflow-hidden ring-1 ring-[#e4edee] shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300">
                  <div className="aspect-[16/10] overflow-hidden bg-[#f2f6f7]">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
                <h3 className="mt-2 font-nunito italic font-extrabold text-[15px] text-[#2c4f63] leading-snug">
                  {course.title}
                </h3>
              </button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
