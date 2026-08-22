import React, { useState, useEffect } from "react";
import { Check, X, ArrowRight, RotateCcw, PartyPopper } from "lucide-react";
import { QuizVisual } from "./QuizVisual";
import { useAuth } from "../context/AuthContext";
import { API, authConfig } from "../lib/api";

const QuizStage = ({ quiz, questionIndex, onQuestionIndexChange }) => {
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState({});
  const { token } = useAuth();

  const total = quiz.questions.length;
  const q = quiz.questions[questionIndex];

  // reset selection when the question changes (e.g. via sidebar)
  useEffect(() => {
    setSelected(null);
    setLocked(false);
  }, [questionIndex]);

  const handleSelect = (opt) => {
    if (locked) return;
    setSelected(opt);
    setLocked(true);
    setAnswers((current) => ({ ...current, [q.id]: opt }));
  };

  const handleNext = async () => {
    if (questionIndex + 1 >= total) {
      const response = await fetch(`${API}/quizzes/${quiz.id}/attempts`, {
        ...authConfig(token),
        method: "POST",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        body: JSON.stringify({ answers: Object.entries({ ...answers, [q.id]: selected }).map(([question_id, answer]) => ({ question_id, answer })) }),
      });
      if (response.ok) {
        const result = await response.json();
        setScore(result.score);
      }
      setFinished(true);
    } else {
      onQuestionIndexChange(questionIndex + 1);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setFinished(false);
    setSelected(null);
    setLocked(false);
    setAnswers({});
    onQuestionIndexChange(0);
  };

  if (finished) {
    return (
      <section className="flex-1 min-w-0 px-6 pb-8">
        <div className="mt-4 rounded-2xl bg-white p-10 shadow-[0_10px_30px_-14px_rgba(80,140,150,0.5)] flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-[#eafafa] flex items-center justify-center mb-4">
            <PartyPopper size={40} className="text-[#4c9a9a]" />
          </div>
          <h2 className="font-nunito font-extrabold text-[22px] text-[#2c4f63]">
            Selesai! Kerja bagus 🎉
          </h2>
          <p className="font-nunito text-[15px] text-[#5c777c] mt-2">
            Skor kamu:{" "}
            <span className="font-bold text-[#4c9a9a]">
              {score} / {total}
            </span>
          </p>
          <button
            onClick={handleRestart}
            className="mt-6 inline-flex items-center gap-2 bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] px-6 py-2.5 rounded-xl transition-colors"
          >
            <RotateCcw size={16} /> Ulangi Latihan
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0 px-6 pb-8">
      <div className="mt-4 rounded-2xl bg-white shadow-[0_10px_30px_-14px_rgba(80,140,150,0.5)] overflow-hidden">
        {/* progress */}
        <div className="flex items-center justify-between px-6 pt-4">
          <span className="font-nunito text-[13px] text-[#8aa0a3]">
            Soal {questionIndex + 1} dari {total}
          </span>
          <span className="font-nunito text-[13px] font-bold text-[#4c9a9a]">
            Skor: {finished ? score : "-"}
          </span>
        </div>

        {/* prompt */}
        <div className="flex items-center justify-center py-8 md:py-10">
          <div key={q.id} className="animate-popIn">
            <QuizVisual type={quiz.type} value={q.prompt} size={170} />
          </div>
        </div>

        {/* question + options panel */}
        <div className="bg-gradient-to-b from-[#8bdcd8] to-[#78d2ce] px-5 py-6 rounded-t-3xl">
          <h2 className="text-center font-nunito italic font-extrabold text-white text-[22px] md:text-[26px] drop-shadow mb-5">
            {q.question}
          </h2>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {q.options.map((opt) => {
              const isSelected = selected === opt;
              let ring = "ring-2 ring-white/60";
              let badge = null;
              if (locked && isSelected) {
                ring = "ring-4 ring-[#3ec46e]";
                badge = (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#3ec46e] flex items-center justify-center">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </span>
                );
              }
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={locked}
                  className={`relative rounded-2xl bg-[#eef4f4] hover:bg-white ${ring} shadow-md flex flex-col items-center justify-center py-5 transition-all duration-200 ${
                    !locked ? "hover:-translate-y-1" : ""
                  }`}
                >
                  {badge}
                  <QuizVisual type={quiz.type} value={opt} size={quiz.type === "emotion" ? 84 : 96} />
                  {quiz.type === "emotion" && (
                    <span className="mt-2 font-nunito font-bold text-[14px] text-[#2c5f66]">
                      {opt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {locked && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-white text-[#2c7d7d] hover:bg-[#f2fbfb] font-nunito font-bold text-[14px] px-6 py-2.5 rounded-xl shadow transition-colors"
              >
                {questionIndex + 1 >= total ? "Selesai" : "Lanjut"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuizStage;
