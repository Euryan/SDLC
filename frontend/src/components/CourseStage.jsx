import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward, Video } from "lucide-react";
import { ASSETS } from "../mock";
import VrmCharacter from "./VrmCharacter";
import MediaPipeBodyEstimation from "./MediaPipeBodyEstimation";
import { MOTORIK_ANIMATIONS } from "../animations/motorikAnimations";
import haloSound from "../sound/Halo.wav";

const CourseStage = ({ module }) => {
  const [animationIndex, setAnimationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [waveTrigger, setWaveTrigger] = useState(0);
  const haloAudioRef = useRef(null);
  const haloDelayRef = useRef(null);
  const activeAnimation = MOTORIK_ANIMATIONS[animationIndex];

  useEffect(() => {
    const audio = new Audio(haloSound);
    audio.preload = "auto";
    audio.playbackRate = 0.78;
    audio.defaultPlaybackRate = 0.78;
    haloAudioRef.current = audio;
    return () => {
      if (haloDelayRef.current) clearTimeout(haloDelayRef.current);
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

  const contentType = module.contentType || "vrm";
  const isVrm = contentType === "vrm";
  const isMedia = contentType === "image" || contentType === "video";

  return (
    <section className="flex-1 min-w-0 px-6 pb-8">
      <h1 className="font-nunito italic font-extrabold text-[22px] text-[#2c4f63] mt-4 mb-3">
        {module.stageTitle}
      </h1>

      <div className="relative rounded-2xl overflow-hidden bg-white p-2 shadow-[0_10px_30px_-12px_rgba(80,140,150,0.5)]">
        <div
          key={module.id}
          className={`relative rounded-xl overflow-hidden aspect-[16/10] animate-stageIn ${isVrm ? "" : "bg-[#edf8f7]"}`}
        >
          {isVrm && <img src={ASSETS.bgsekolah} alt="Latar sekolah" className="absolute inset-0 w-full h-full object-cover" />}

          {isMedia && module.mediaUrl && contentType === "image" && (
            <img src={module.mediaUrl} alt={module.name} className="h-full w-full object-contain" />
          )}
          {isMedia && module.mediaUrl && contentType === "video" && (
            <video src={module.mediaUrl} controls className="h-full w-full object-contain" aria-label={`Video ${module.name}`} />
          )}
          {!isVrm && !module.mediaUrl && (
            <div className="flex h-full items-center justify-center px-6 text-center font-nunito text-sm text-[#719095]">
              Media materi belum tersedia.
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
              <MediaPipeBodyEstimation onWave={handleWave} />
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

      <div className="mt-5 grid gap-4 rounded-2xl bg-white p-4 shadow-[0_10px_30px_-18px_rgba(80,140,150,0.7)] md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] md:p-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eafafa] text-[#3aa0a0]">
              <Video size={17} />
            </div>
            <h2 className="font-nunito text-base font-extrabold text-[#2c4f63]">Penjelasan materi</h2>
          </div>
          <p className="font-nunito text-sm leading-relaxed text-[#4c6a70]">
            {module.materialText || module.description || "Ikuti contoh dari karakter, lalu praktikkan langkahnya secara perlahan."}
          </p>
          <p className="mt-3 font-nunito text-xs leading-relaxed text-[#8aa0a3]">
            {isVrm ? "Amati gerakan karakter pada stage, tonton video, kemudian coba ulangi dengan nyaman." : "Baca materi atau amati media di atas dengan nyaman."}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl bg-[#edf8f7] p-1">
          <video
            src={ASSETS.eyeVideo}
            controls
            preload="metadata"
            className="aspect-video w-full rounded-lg object-cover"
            aria-label={`Video penjelasan ${module.name}`}
          />
        </div>
      </div>
    </section>
  );
};

export default CourseStage;
