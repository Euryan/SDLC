import React from "react";
import { Sparkles, Smile, Frown, Angry, Annoyed, Meh } from "lucide-react";

// Cute glossy bubble letter rendered with CSS (no external image needed)
export const GlossyLetter = ({ char, size = 150 }) => (
  <div
    className="relative inline-flex items-center justify-center select-none"
    style={{ width: size, height: size }}
  >
    <Sparkles
      size={size * 0.16}
      className="absolute -top-1 left-2 text-white/90"
      style={{ filter: "drop-shadow(0 1px 1px rgba(220,140,150,0.6))" }}
    />
    <Sparkles
      size={size * 0.1}
      className="absolute bottom-3 left-4 text-white/80"
    />
    <span
      className="font-fredoka font-bold leading-none"
      style={{
        fontSize: size,
        color: "#f19aa4",
        WebkitTextStroke: `${Math.max(3, size * 0.03)}px #e6808d`,
        textShadow:
          "0 4px 0 rgba(214,120,132,0.35), 0 2px 6px rgba(214,120,132,0.4)",
      }}
    >
      {char}
    </span>
    <span
      className="absolute font-fredoka font-bold leading-none pointer-events-none"
      style={{
        fontSize: size,
        color: "transparent",
        WebkitTextStroke: "0",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 45%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      }}
    >
      {char}
    </span>
  </div>
);

const EMOTION_MAP = {
  happy: { Icon: Smile, color: "#f6b93b", bg: "#fff3d6" },
  sad: { Icon: Frown, color: "#5b8def", bg: "#e2ecff" },
  angry: { Icon: Angry, color: "#eb6b6b", bg: "#ffe0e0" },
  surprised: { Icon: Annoyed, color: "#a06be0", bg: "#efe2ff" },
  fear: { Icon: Meh, color: "#5aa9a0", bg: "#d9f2ee" },
  // Indonesian option labels
  Senang: { Icon: Smile, color: "#f6b93b", bg: "#fff3d6" },
  Sedih: { Icon: Frown, color: "#5b8def", bg: "#e2ecff" },
  Marah: { Icon: Angry, color: "#eb6b6b", bg: "#ffe0e0" },
  Terkejut: { Icon: Annoyed, color: "#a06be0", bg: "#efe2ff" },
  Takut: { Icon: Meh, color: "#5aa9a0", bg: "#d9f2ee" },
};

export const EmotionFace = ({ emotion, size = 150 }) => {
  const cfg = EMOTION_MAP[emotion] || EMOTION_MAP.happy;
  const { Icon } = cfg;
  return (
    <div
      className="inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: cfg.bg }}
    >
      <Icon size={size * 0.62} strokeWidth={2} color={cfg.color} />
    </div>
  );
};

export const QuizVisual = ({ type, value, size }) =>
  type === "emotion" ? (
    <EmotionFace emotion={value} size={size} />
  ) : (
    <GlossyLetter char={value} size={size} />
  );
