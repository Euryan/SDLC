import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import Header from "../components/Header";
import VrmCharacter from "../components/VrmCharacter";
import { MOTORIK_ANIMATIONS } from "../animations/motorikAnimations";
import { ASSETS } from "../mock";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AI_COMPANION } from "../constants/testIds";

const ANIMATION_BY_ID = Object.fromEntries(MOTORIK_ANIMATIONS.map((clip) => [clip.id, clip]));
// Browser Web Speech API (Chrome routes this through Google's free STT/TTS voices).
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const TYPE_SPEED_MS = 28;
const SPEAKER_STYLES = {
  Kamu: "bg-[#ffb066] text-[#4a2c00]",
  Luna: "bg-[#6fcccb] text-[#0d2430]",
};

const STT_ERROR_MESSAGES = {
  "no-speech": "Tidak ada suara terdeteksi, coba lagi.",
  "audio-capture": "Mikrofon tidak ditemukan.",
  "not-allowed": "Izin mikrofon ditolak, aktifkan di pengaturan browser.",
  network: "Koneksi bermasalah saat mendengarkan, coba lagi.",
};

// Voice names commonly used by Chrome/Edge/OS TTS engines to mark gender.
const FEMALE_VOICE_HINTS = ["female", "wanita", "perempuan", "damayanti", "gadis", "siti", "putri", "woman"];
const MALE_VOICE_HINTS = ["male", "pria", "andika", "man"];

let cachedVoices = [];
const loadVoices = () => {
  cachedVoices = window.speechSynthesis?.getVoices() || [];
  return cachedVoices;
};
if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Picks an id-ID voice explicitly labeled female when available; otherwise falls
// back to any Indonesian voice (pitch is nudged up in speak() as a softer fallback).
const pickIndonesianFemaleVoice = () => {
  const voices = cachedVoices.length ? cachedVoices : loadVoices();
  const idVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("id"));
  if (!idVoices.length) return null;
  const female = idVoices.find(
    (voice) =>
      FEMALE_VOICE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint)) &&
      !MALE_VOICE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint))
  );
  return female || idVoices[0];
};

const AICompanionPage = () => {
  const { token } = useAuth();
  const [micOn, setMicOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [dialogue, setDialogue] = useState({ speaker: null, text: "" });
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef(null);
  const typingTimerRef = useRef(null);
  const conversationIdRef = useRef(null);
  // Mirrors state in refs so the recognition callbacks always see the latest value.
  const micOnRef = useRef(false);
  const thinkingRef = useRef(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);
  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  // Every mount/refresh of this page starts a brand-new session, so the child's
  // chat history never mixes across visits or with the parent-facing Luna Help widget.
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/companion/session/start`, { ...authConfig(token), method: "POST" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        conversationIdRef.current = data.conversationId;
      })
      .catch(() => setError("Sesi AI Companion belum dapat dimulai."));
  }, [token]);

  // Types out the current dialogue line, visual-novel style (same effect as VisualNovelStage).
  useEffect(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (!dialogue.speaker) return undefined;
    setTypedText("");
    setIsTyping(true);
    let charIndex = 0;
    const text = dialogue.text || "";
    typingTimerRef.current = setInterval(() => {
      charIndex += 1;
      setTypedText(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(typingTimerRef.current);
  }, [dialogue]);

  const handleUserUtterance = async (text) => {
    if (!token) return;
    setDialogue({ speaker: "Kamu", text });
    setInterimTranscript("");
    setError("");
    setThinking(true);
    try {
      const response = await fetch(`${API}/companion/chat`, {
        ...authConfig(token),
        method: "POST",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        // Luna companion page is child-facing: friendly tone only, no concrete data.
        body: JSON.stringify({
          message: text,
          audience: "child",
          conversationId: conversationIdRef.current,
        }),
      });
      if (!response.ok) throw new Error("Gagal menghubungi AI Companion");
      const data = await response.json();
      conversationIdRef.current = data.conversationId;
      setDialogue({ speaker: "Luna", text: data.reply });
      speak(data.reply);
    } catch {
      setError("AI Companion belum dapat membalas, coba lagi.");
    } finally {
      setThinking(false);
    }
  };

  // Starts one listening turn; auto-restarts itself on end while the mic is toggled on.
  const startListeningTurn = () => {
    if (!SpeechRecognitionCtor || !micOnRef.current) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) handleUserUtterance(final.trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(STT_ERROR_MESSAGES[event.error] || "Tidak dapat mendengar suara, coba lagi.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      // Keep the "on" state alive by starting the next turn automatically.
      if (micOnRef.current && !thinkingRef.current && !speakingRef.current) {
        startListeningTurn();
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* recognition already starting, ignore */
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) {
      if (micOnRef.current) startListeningTurn();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    const voice = pickIndonesianFemaleVoice();
    if (voice) {
      utterance.voice = voice;
    } else {
      // No explicitly-labeled female id-ID voice found; raise pitch for a softer tone.
      utterance.pitch = 1.2;
    }
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      if (micOnRef.current) startListeningTurn();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      if (micOnRef.current) startListeningTurn();
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = async () => {
    if (micOn) {
      micOnRef.current = false;
      setMicOn(false);
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognitionCtor) return;
    try {
      // Triggers the mic permission prompt and fails fast if it's denied/missing.
      await navigator.mediaDevices?.getUserMedia({ audio: true });
    } catch {
      setError(STT_ERROR_MESSAGES["not-allowed"]);
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setError("");
    setInterimTranscript("");
    setDialogue({ speaker: null, text: "" });
    micOnRef.current = true;
    setMicOn(true);
    startListeningTurn();
  };

  // Text input goes through the exact same flow as a recognized STT utterance.
  const sendTextMessage = () => {
    const text = textInput.trim();
    if (!text || thinking) return;
    setTextInput("");
    handleUserUtterance(text);
  };

  const handleTextKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendTextMessage();
    }
  };

  const activeAnimation = useMemo(() => {
    if (speaking) return ANIMATION_BY_ID.talking;
    if (thinking) return ANIMATION_BY_ID.thinking;
    return ANIMATION_BY_ID.idle;
  }, [speaking, thinking]);

  const statusLabel = !micOn
    ? "Mikrofon nonaktif, tekan untuk mengaktifkan"
    : listening
    ? "Mendengarkan..."
    : thinking
    ? "Memproses..."
    : speaking
    ? "Menjawab..."
    : "Mikrofon aktif, menunggu Anda berbicara";

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f7] overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 p-4 md:p-6 gap-4">
        <div className="relative flex-1 min-h-0 w-full rounded-3xl overflow-hidden bg-white shadow-[0_10px_30px_-18px_rgba(80,140,150,0.7)] ring-1 ring-[#e7eef0]">
          <img src={ASSETS.bgsekolah} alt="Latar sekolah" className="absolute inset-0 w-full h-full object-cover" />

          <div className="absolute inset-x-[10%] md:inset-x-[25%] bottom-0 top-0 z-10 pointer-events-none">
            <VrmCharacter animationUrl={activeAnimation.url} animationType={activeAnimation.type} isPlaying />
          </div>

          {dialogue.speaker && (
            <div className="absolute inset-x-3 bottom-3 md:inset-x-6 md:bottom-6 z-20 rounded-2xl bg-[#0d2430]/85 p-5 shadow-lg ring-1 ring-white/10 backdrop-blur-sm md:p-6">
              <span
                className={`mb-2 inline-block rounded-md px-3 py-1.5 font-nunito text-sm font-extrabold md:text-base ${SPEAKER_STYLES[dialogue.speaker]}`}
              >
                {dialogue.speaker}
              </span>
              <p
                data-testid={AI_COMPANION.captionText}
                className="min-h-[2.5em] font-nunito text-base leading-relaxed text-white md:text-xl"
              >
                {typedText}
                {isTyping && <span className="animate-pulse">▌</span>}
              </p>
            </div>
          )}

          {error && (
            <div className="absolute top-4 inset-x-4 md:inset-x-16 z-20 flex justify-center">
              <p className="bg-white/95 text-[#eb5757] rounded-full px-4 py-1.5 font-nunito text-[13px] shadow">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2 pb-1">
          {SpeechRecognitionCtor ? (
            <button
              data-testid={AI_COMPANION.micButton}
              onClick={toggleMic}
              className={`h-16 w-16 rounded-full flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(90,180,180,0.9)] transition-all ${
                micOn ? "bg-[#eb5757]" : "bg-[#6fcccb] hover:brightness-105"
              } ${listening ? "animate-pulse" : ""}`}
            >
              {micOn ? <MicOff size={26} className="text-white" /> : <Mic size={26} className="text-white" />}
            </button>
          ) : (
            <p className="font-nunito text-[12px] text-[#eb5757] text-center max-w-xs">
              Browser ini belum mendukung fitur suara. Gunakan Google Chrome.
            </p>
          )}
          <p className="font-nunito text-[12px] text-[#8aa0a3]">{statusLabel}</p>

          <div className="w-full max-w-md flex items-center gap-2">
            <input
              data-testid={AI_COMPANION.messageInput}
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              onKeyDown={handleTextKeyDown}
              disabled={thinking}
              placeholder="Atau tulis pesan..."
              className="flex-1 rounded-full bg-white px-4 py-2.5 font-nunito text-[14px] text-[#2c4f63] outline-none ring-1 ring-[#e7eef0] focus:ring-2 focus:ring-[#6fcccb] disabled:opacity-60"
            />
            <button
              data-testid={AI_COMPANION.sendButton}
              onClick={sendTextMessage}
              disabled={thinking || !textInput.trim()}
              className="shrink-0 h-10 w-10 rounded-full bg-[#6fcccb] text-white flex items-center justify-center hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AICompanionPage;
