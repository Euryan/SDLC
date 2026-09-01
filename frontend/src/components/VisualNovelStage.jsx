import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, PartyPopper, X } from "lucide-react";
import VrmCharacter from "./VrmCharacter";
import MediaPipeBodyEstimation from "./MediaPipeBodyEstimation";
import { MOTORIK_ANIMATIONS } from "../animations/motorikAnimations";

const DEFAULT_ANIMATION = MOTORIK_ANIMATIONS.find((a) => a.id === "talking") || MOTORIK_ANIMATIONS[0];
const TYPE_SPEED_MS = 28;

// Visual novel style dialogue player: bubble text, typewriter reveal, per-line character animation + voice.
// A line with requiresWave: true pauses progression until the camera detects the user waving.
// A line with quiz: { options } pauses progression until the user taps the correct picture.
const VisualNovelStage = ({ narrative, background, characterName }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [waveConfirmed, setWaveConfirmed] = useState(false);
  const [quizSelection, setQuizSelection] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const typingTimerRef = useRef(null);
  const quizRetryTimerRef = useRef(null);
  const quizAdvanceTimerRef = useRef(null);
  const voiceRef = useRef(null);

  const lines = Array.isArray(narrative) && narrative.length ? narrative : null;
  const currentLine = lines ? lines[Math.min(lineIndex, lines.length - 1)] : null;
  const isLastLine = lines ? lineIndex >= lines.length - 1 : true;
  const awaitingWave = !!currentLine?.requiresWave && !waveConfirmed;
  const awaitingQuiz = !!currentLine?.quiz && quizResult !== "correct";

  const animation =
    (currentLine?.animationId && MOTORIK_ANIMATIONS.find((a) => a.id === currentLine.animationId)) ||
    DEFAULT_ANIMATION;

  useEffect(() => {
    if (!currentLine) return undefined;
    setTypedText("");
    setIsTyping(true);
    setWaveConfirmed(false);
    setQuizSelection(null);
    setQuizResult(null);
    if (quizRetryTimerRef.current) clearTimeout(quizRetryTimerRef.current);
    if (quizAdvanceTimerRef.current) clearTimeout(quizAdvanceTimerRef.current);
    let charIndex = 0;
    const text = currentLine.text || "";

    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current = null;
    }
    if (currentLine.voiceUrl) {
      const audio = new Audio(currentLine.voiceUrl);
      audio.play().catch(() => {});
      voiceRef.current = audio;
    }

    typingTimerRef.current = setInterval(() => {
      charIndex += 1;
      setTypedText(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, TYPE_SPEED_MS);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (quizRetryTimerRef.current) clearTimeout(quizRetryTimerRef.current);
      if (quizAdvanceTimerRef.current) clearTimeout(quizAdvanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex]);

  useEffect(
    () => () => {
      if (voiceRef.current) voiceRef.current.pause();
    },
    []
  );

  const handleAdvance = () => {
    if (!lines) return;
    if (isTyping) {
      clearInterval(typingTimerRef.current);
      setTypedText(currentLine.text || "");
      setIsTyping(false);
      return;
    }
    if (awaitingWave || awaitingQuiz) return;
    if (!isLastLine) setLineIndex((current) => current + 1);
  };

  const handleWaveDetected = () => {
    if (!currentLine?.requiresWave || isTyping) return;
    setWaveConfirmed(true);
    if (!isLastLine) setLineIndex((current) => current + 1);
  };

  const handleQuizSelect = (option) => {
    if (!currentLine?.quiz || isTyping || quizResult === "correct") return;
    setQuizSelection(option.id);
    if (option.correct) {
      setQuizResult("correct");
      quizAdvanceTimerRef.current = setTimeout(() => {
        if (!isLastLine) setLineIndex((current) => current + 1);
      }, 1200);
    } else {
      setQuizResult("wrong");
      quizRetryTimerRef.current = setTimeout(() => {
        setQuizResult(null);
        setQuizSelection(null);
      }, 900);
    }
  };

  if (!lines) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center font-nunito text-sm text-[#719095]">
        Naskah visual novel belum tersedia.
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full cursor-pointer select-none"
      onClick={handleAdvance}
      role="button"
      tabIndex={0}
      aria-label="Ketuk untuk melanjutkan dialog"
    >
      {background && (
        <img src={background} alt="Latar visual novel" className="absolute inset-0 h-full w-full object-cover" />
      )}

      <div
        key={lineIndex}
        className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center pointer-events-none animate-stageIn"
      >
        <div className="w-[70%] max-w-md">
          <VrmCharacter animationUrl={animation.url} animationType={animation.type} isPlaying oneShot={false} />
        </div>
      </div>

      {currentLine.image && !currentLine.quiz && (
        <img
          src={currentLine.image}
          alt="Alat tulis"
          className="absolute right-4 top-1/2 z-10 h-24 w-24 -translate-y-1/2 rounded-xl object-cover shadow-lg ring-4 ring-white/80 animate-popIn md:right-10 md:h-40 md:w-40"
        />
      )}

      {awaitingWave && (
        <div
          className="absolute top-4 right-4 z-30 h-28 w-32 md:h-36 md:w-44 rounded-xl bg-white/95 shadow-lg ring-1 ring-[#cfeeee] p-1.5 animate-floaty"
          onClick={(event) => event.stopPropagation()}
        >
          <MediaPipeBodyEstimation onWave={handleWaveDetected} />
        </div>
      )}

      <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl bg-[#0d2430]/85 p-5 shadow-lg ring-1 ring-white/10 backdrop-blur-sm md:inset-x-6 md:bottom-6 md:p-6">
        {(currentLine.speaker || characterName) && (
          <span className="mb-2 inline-block rounded-md bg-[#6fcccb] px-3 py-1.5 font-nunito text-sm font-extrabold text-[#0d2430] md:text-base">
            {currentLine.speaker || characterName}
          </span>
        )}
        <p className="min-h-[3em] font-nunito text-lg leading-relaxed text-white md:text-2xl">
          {typedText}
          {isTyping && <span className="animate-pulse">▌</span>}
        </p>
        {currentLine.quiz && !isTyping && (
          <div className="mt-4 flex justify-center gap-3" onClick={(event) => event.stopPropagation()}>
            {currentLine.quiz.options.map((option) => {
              const isSelected = quizSelection === option.id;
              const ringClass =
                isSelected && quizResult === "correct"
                  ? "ring-green-400"
                  : isSelected && quizResult === "wrong"
                  ? "ring-red-400"
                  : "ring-white/70";
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleQuizSelect(option)}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl shadow-lg ring-4 transition md:h-28 md:w-28 ${ringClass}`}
                  aria-label={option.label}
                >
                  <img src={option.imageUrl} alt={option.label} className="h-full w-full object-cover" />
                  {isSelected && quizResult === "correct" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-green-500/40">
                      <Check size={28} className="text-white" />
                    </span>
                  )}
                  {isSelected && quizResult === "wrong" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-red-500/40">
                      <X size={28} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {lines.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === lineIndex ? "bg-[#6fcccb]" : "bg-white/30"}`} />
            ))}
          </div>
          <span className="flex items-center gap-1 font-nunito text-xs font-bold text-white/70 md:text-sm">
            {isTyping
              ? "Ketuk untuk percepat"
              : awaitingWave
              ? "Lambaikan tanganmu di depan kamera"
              : awaitingQuiz
              ? "Pilih gambar yang sesuai"
              : isLastLine
              ? "Selesai"
              : "Ketuk untuk lanjut"}
            {(awaitingWave || awaitingQuiz) && <PartyPopper size={14} />}
            {!isTyping && !isLastLine && !awaitingWave && !awaitingQuiz && <ChevronRight size={14} />}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisualNovelStage;
