import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, SkipForward } from "lucide-react";
import { ASSETS } from "../mock";
import VrmCharacter from "./VrmCharacter";
import MediaPipeBodyEstimation from "./MediaPipeBodyEstimation";
import VisualNovelStage from "./VisualNovelStage";
import { MOTORIK_ANIMATIONS } from "../animations/motorikAnimations";
import haloSound from "../sound/Halo.wav";
import dontTurnSound from "../sound/ehjanganberpaling.wav";
import lookHereSound from "../sound/hayoliatkemana.wav";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const CourseStage = ({ module, nextModule, onNext }) => {
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [waveTrigger, setWaveTrigger] = useState(0);
  const { token } = useAuth();
  const haloAudioRef = useRef(null);
  const haloDelayRef = useRef(null);
  const focusSoundDelayRef = useRef(null);
  const activeAnimation = MOTORIK_ANIMATIONS[animationIndex];

  useEffect(() => {
    const audio = new Audio(haloSound);
    audio.preload = "auto";
    audio.playbackRate = 0.78;
    audio.defaultPlaybackRate = 0.78;
    haloAudioRef.current = audio;
    return () => {
      if (haloDelayRef.current) clearTimeout(haloDelayRef.current);
      if (focusSoundDelayRef.current) clearTimeout(focusSoundDelayRef.current);
      audio.pause();
      haloAudioRef.current = null;
    };
  }, []);

  const nextAnimation = () => {
    setAnimationIndex((current) => (current + 1) % MOTORIK_ANIMATIONS.length);
    setIsPlaying(true);
  };

  const handleWave = () => {
    const greetingIndex = MOTORIK_ANIMATIONS.findIndex((animation) => animation.id === "greeting");
    const audio = haloAudioRef.current;
    if (audio) {
      if (haloDelayRef.current) clearTimeout(haloDelayRef.current);
      haloDelayRef.current = setTimeout(() => {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }, 1000);
    }
    if (greetingIndex >= 0) setAnimationIndex(greetingIndex);
    setIsPlaying(true);
    setWaveTrigger((current) => current + 1);
  };

  const handleFocusLost = () => {
    const reminderIndex = MOTORIK_ANIMATIONS.findIndex((animation) => animation.id === "vrma-02");
    if (reminderIndex >= 0) setAnimationIndex(reminderIndex);
    setIsPlaying(true);
    const reminderSound = Math.random() < 0.5 ? dontTurnSound : lookHereSound;
    if (focusSoundDelayRef.current) clearTimeout(focusSoundDelayRef.current);
    focusSoundDelayRef.current = setTimeout(() => {
      const audio = new Audio(reminderSound);
      audio.play().catch(() => {});
      focusSoundDelayRef.current = null;
    }, 1000);
    if (token) {
      fetch(`${API}/lessons/${module.id}/focus-events`, {
        ...authConfig(token),
        method: "POST",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  };

  const handleFocusDetected = () => {
    if (focusSoundDelayRef.current) {
      clearTimeout(focusSoundDelayRef.current);
      focusSoundDelayRef.current = null;
    }
  };

  const contentType = module.contentType || "vrm";
  const isVrm = contentType === "vrm";
  const isVisualNovel = contentType === "visual_novel";
  const isMedia = contentType === "image" || contentType === "video";
  const isYoutube = contentType === "video" && module.mediaUrl?.includes("youtube.com/embed/");

  const narrative = useMemo(() => {
    if (!isVisualNovel || !module.materialText) return null;
    try {
      const parsed = JSON.parse(module.materialText);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [isVisualNovel, module.materialText]);

  return (
    <section className="flex-1 min-w-0 px-6 pb-8">
      <h1 className="font-nunito italic font-extrabold text-[22px] text-[#2c4f63] mt-4 mb-3">
        {module.stageTitle}
      </h1>

      <div className="relative rounded-2xl overflow-hidden bg-white p-2 shadow-[0_10px_30px_-12px_rgba(80,140,150,0.5)]">
        <div
          key={module.id}
          className={`relative rounded-xl overflow-hidden aspect-[16/10] animate-stageIn ${isVrm || isVisualNovel ? "" : "bg-[#edf8f7]"}`}
        >
          {isVrm && <img src={ASSETS.bgsekolah} alt="Latar sekolah" className="absolute inset-0 w-full h-full object-cover" />}

          {isVisualNovel && (
            <VisualNovelStage
              narrative={narrative}
              background={module.mediaUrl || ASSETS.bgsekolah}
              characterName={module.name}
            />
          )}

          {isMedia && module.mediaUrl && contentType === "image" && (
            <img src={module.mediaUrl} alt={module.name} className="h-full w-full object-contain" />
          )}
          {isMedia && module.mediaUrl && contentType === "video" && isYoutube && module.mediaUrl !== "https://www.youtube.com/embed/VIDEO_ID" && (
            <iframe
              src={module.mediaUrl}
              title={`Video ${module.name}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {isMedia && module.mediaUrl && contentType === "video" && !isYoutube && (
            <video src={module.mediaUrl} controls className="h-full w-full object-contain" aria-label={`Video ${module.name}`} />
          )}
          {!isVrm && !module.mediaUrl && (
            <div className="flex h-full items-center justify-center px-6 text-center font-nunito text-sm text-[#719095]">
              Media materi belum tersedia.
            </div>
          )}
          {isYoutube && module.mediaUrl === "https://www.youtube.com/embed/VIDEO_ID" && (
            <div className="flex h-full items-center justify-center px-6 text-center font-nunito text-sm text-[#719095]">
              Video YouTube belum dipilih.
            </div>
          )}
          {contentType === "article" && (
            <div className="flex h-full items-center justify-center overflow-auto p-6 md:p-10">
              <p className="max-w-2xl whitespace-pre-line font-nunito text-base leading-relaxed text-[#2c4f63]">
                {module.materialText || module.description || "Materi belum tersedia."}
              </p>
            </div>
          )}

          {isVrm && module.showBodyEstimation && (
            <div className="absolute top-4 right-4 z-20 h-28 w-32 md:h-36 md:w-44 rounded-xl bg-white/95 shadow-lg ring-1 ring-[#cfeeee] p-1.5 animate-floaty">
              <MediaPipeBodyEstimation onWave={handleWave} onFocusLost={handleFocusLost} onFocusDetected={handleFocusDetected} />
            </div>
          )}
          {isVrm && <div className="absolute top-[22%] left-[52%] md:left-[56%] z-20 animate-popIn"><span className="font-caveat font-bold text-[#1f2a2e] text-[34px] md:text-[52px] drop-shadow-sm">{module.speech}</span></div>}
          {isVrm && <div className="absolute inset-x-[5%] bottom-0 top-0 z-10 overflow-hidden pointer-events-none"><VrmCharacter animationUrl={activeAnimation.url} animationType={activeAnimation.type} isPlaying={isPlaying} oneShot={activeAnimation.id === "greeting"} playTrigger={waveTrigger} /></div>}
        </div>
      </div>

      {isVrm && <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPlaying((playing) => !playing)}
          aria-label={isPlaying ? "Jeda animasi" : "Putar animasi"}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2c4f63] px-3 font-nunito text-xs font-bold text-white shadow-sm transition hover:bg-[#1f3d4f]"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={nextAnimation}
          aria-label={`Animasi berikutnya: ${MOTORIK_ANIMATIONS[(animationIndex + 1) % MOTORIK_ANIMATIONS.length].label}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b9d6d8] bg-white px-3 font-nunito text-xs font-bold text-[#2c4f63] shadow-sm transition hover:bg-[#eef8f7]"
        >
          <SkipForward size={15} />
          Next: {activeAnimation.label}
        </button>
      </div>}

      <p className="mt-4 font-nunito text-[14px] text-[#4c6a70] max-w-2xl leading-relaxed">
        {module.description}
      </p>

      <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6fcccb] px-4 py-2.5 font-nunito text-sm font-extrabold text-white shadow-sm transition hover:bg-[#4eb8b7]"
          >
            {nextModule ? `Berikutnya: ${nextModule.name}` : "Selesaikan materi"} <ArrowRight size={16} />
          </button>
      </div>

    </section>
  );
};

export default CourseStage;
