import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import CourseStage from "../components/CourseStage";
import Footer from "../components/Footer";
import QuizLessonPage from "./QuizLessonPage";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// Anime "stage" style lesson (used for Motorik and as default)
const AnimeLesson = ({ chapters, requestedModuleId }) => {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openChapters, setOpenChapters] = useState(chapters[0] ? [chapters[0].id] : []);
  const initialModule = chapters
    .flatMap((chapter) => chapter.modules)
    .find((module) => module.id === requestedModuleId) || chapters[0]?.modules[0];
  const [activeModule, setActiveModule] = useState(initialModule);
  const activeChapterIndex = chapters.findIndex((chapter) =>
    chapter.modules.some((module) => module.id === activeModule.id)
  );
  const activeChapter = chapters[activeChapterIndex];
  const activeModuleIndex = activeChapter?.modules.findIndex((module) => module.id === activeModule.id) ?? -1;
  const nextModule = activeChapter?.modules[activeModuleIndex + 1] || chapters[activeChapterIndex + 1]?.modules[0];
  const completeAndNext = async () => {
    if (token) {
      const completingChapter = activeChapter && activeModuleIndex === activeChapter.modules.length - 1;
      const modulesToComplete = completingChapter ? activeChapter.modules : [activeModule];
      await Promise.all(modulesToComplete.map((module) => fetch(`${API}/lessons/${module.id}/progress`, {
        ...authConfig(token),
        method: "POST",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      }).catch(() => null)));
    }
    if (nextModule) setActiveModule(nextModule);
  };

  useEffect(() => {
    if (!token || !activeModule?.id) return;
    fetch(`${API}/lessons/${activeModule.id}/progress`, {
      ...authConfig(token),
      method: "POST",
      headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "started" }),
    }).catch(() => {});
  }, [activeModule?.id, token]);

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
        <CourseStage module={activeModule} nextModule={nextModule} onNext={completeAndNext} />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQuiz(null);
    setChapters([]);
    setLoading(true);

    // Courses may bring their own chapters (e.g. an alat tulis visual novel); only fall
    // back to the shared category quiz when the specific course has no chapters at all.
    fetch(`${API}/courses/${courseId || "c-alfabet"}/chapters`)
      .then((response) => (response.ok ? response.json() : []))
      .then((courseChapters) => {
        if (Array.isArray(courseChapters) && courseChapters.length) {
          setChapters(courseChapters);
          setLoading(false);
          return;
        }
        if (categoryId === "visual" || categoryId === "emosi") {
          fetch(`${API}/quizzes/quiz-${categoryId}`)
            .then((response) => response.json())
            .then(setQuiz)
            .catch(() => setQuiz(null))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [categoryId, courseId]);

  if (quiz) {
    return <QuizLessonPage quiz={quiz} />;
  }
  if (loading || !chapters.length) return <div className="min-h-screen flex items-center justify-center font-nunito">Memuat lesson...</div>;
  const requestedModuleId = searchParams.get("module");
  return <AnimeLesson chapters={chapters} requestedModuleId={requestedModuleId} />;
};

export default LessonPage;
