import React, { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import QuizStage from "../components/QuizStage";
import Footer from "../components/Footer";

const QuizLessonPage = ({ quiz }) => {
  const quizSidebar = quiz.type === "letter"
    ? [{ id: "qs-visual", title: "Alfabet", modules: ["A", "B", "C", "D"].map((name, index) => ({ id: `qm-${index + 1}`, name: `Huruf ${name}` })) }]
    : [{ id: "qs-emotion", title: "Emosi", modules: ["Senang", "Sedih", "Marah", "Terkejut"].map((name, index) => ({ id: `qm-${index + 1}`, name })) }];
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openChapters, setOpenChapters] = useState([quizSidebar[0].id]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const toggleChapter = (id) => {
    setOpenChapters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Map first chapter modules to quiz question indices
  const selectModule = (module, chapterId) => {
    if (chapterId === quizSidebar[0].id) {
      const idx = quizSidebar[0].modules.findIndex((m) => m.id === module.id);
      if (idx >= 0 && idx < quiz.questions.length) setQuestionIndex(idx);
    }
  };

  const activeModuleId = quizSidebar[0].modules[questionIndex]?.id;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <main className="flex-1 flex">
        <Sidebar
          open={sidebarOpen}
          openChapters={openChapters}
          onToggleChapter={toggleChapter}
          activeModuleId={activeModuleId}
          onSelectModule={selectModule}
          chapters={quizSidebar}
        />
        <QuizStage
          quiz={quiz}
          questionIndex={questionIndex}
          onQuestionIndexChange={setQuestionIndex}
        />
      </main>
      <Footer />
    </div>
  );
};

export default QuizLessonPage;
