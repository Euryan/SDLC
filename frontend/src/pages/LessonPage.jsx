import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import CourseStage from "../components/CourseStage";
import Footer from "../components/Footer";
import QuizLessonPage from "./QuizLessonPage";
import { API } from "../lib/api";

// Anime "stage" style lesson (used for Motorik and as default)
const AnimeLesson = ({ chapters, requestedModuleId }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openChapters, setOpenChapters] = useState(chapters[0] ? [chapters[0].id] : []);
  const initialModule = chapters
    .flatMap((chapter) => chapter.modules)
    .find((module) => module.id === requestedModuleId) || chapters[0]?.modules[0];
  const [activeModule, setActiveModule] = useState(initialModule);

  const toggleChapter = (id) => {
    setOpenChapters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <main className="flex-1 flex">
        <Sidebar
          open={sidebarOpen}
          chapters={chapters}
          openChapters={openChapters}
          onToggleChapter={toggleChapter}
          activeModuleId={activeModule.id}
          onSelectModule={(m) => setActiveModule(m)}
        />
        <CourseStage module={activeModule} />
      </main>
      <Footer />
    </div>
  );
};

const LessonPage = () => {
  const { categoryId, courseId } = useParams();
  const [searchParams] = useSearchParams();
  const [quiz, setQuiz] = useState(null);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    if (!courseId && (categoryId === "visual" || categoryId === "emosi")) {
      fetch(`${API}/quizzes/quiz-${categoryId}`)
        .then((response) => response.json())
        .then(setQuiz)
        .catch(() => setQuiz(null));
      return;
    }
    fetch(`${API}/courses/${courseId || "c-alfabet"}/chapters`)
      .then((response) => response.json())
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [categoryId, courseId]);

  if (quiz) {
    return <QuizLessonPage quiz={quiz} />;
  }
  if (!chapters.length) return <div className="min-h-screen flex items-center justify-center font-nunito">Memuat lesson...</div>;
  const requestedModuleId = searchParams.get("module");
  return <AnimeLesson chapters={chapters} requestedModuleId={requestedModuleId} />;
};

export default LessonPage;
