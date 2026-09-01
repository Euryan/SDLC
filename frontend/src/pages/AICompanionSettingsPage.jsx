import React, { useEffect, useState } from "react";
import { Settings, MessageCircle, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AI_COMPANION_SETTINGS } from "../constants/testIds";

const PERSONA_OPTIONS = [
  { value: "ceria", label: "Ceria & Bersemangat" },
  { value: "tenang", label: "Tenang & Lembut" },
  { value: "netral", label: "Netral & Stabil" },
];

const SectionTitle = ({ children }) => (
  <h2 className="font-nunito font-extrabold text-[16px] text-[#2c4f63] mb-3">
    {children}
  </h2>
);

const formatSessionDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AICompanionSettingsPage = () => {
  const { token } = useAuth();
  const [persona, setPersona] = useState("netral");
  const [topicRestrictions, setTopicRestrictions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/companion/settings`, authConfig(token))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setPersona(data.persona || "netral");
        setTopicRestrictions(data.topicRestrictions || "");
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setSessionsLoading(true);
    fetch(`${API}/companion/sessions`, authConfig(token))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setSessionsError("Riwayat chat belum dapat dimuat."))
      .finally(() => setSessionsLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaveMessage("");
    setSaveError("");
    try {
      const response = await fetch(`${API}/companion/settings`, {
        ...authConfig(token),
        method: "PUT",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        body: JSON.stringify({ persona, topicRestrictions }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan pengaturan");
      setSaveMessage("Pengaturan tersimpan.");
    } catch {
      setSaveError("Pengaturan belum dapat disimpan, coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f7]">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-[#2c4f63]" />
          <h1 className="font-fredoka font-semibold text-[20px] text-[#2c4f63]">
            Pengaturan AI Companion
          </h1>
        </div>

        <section className="bg-white rounded-2xl p-5 shadow-[0_8px_22px_-16px_rgba(80,140,150,0.8)]">
          <SectionTitle>Persona AI Companion</SectionTitle>
          <p className="font-nunito text-[13px] text-[#8aa0a3] mb-3">
            Pilih nada bicara Luna saat berbicara dengan anak.
          </p>
          <select
            data-testid={AI_COMPANION_SETTINGS.personaSelect}
            value={persona}
            onChange={(event) => setPersona(event.target.value)}
            className="w-full rounded-xl border border-[#e7eef0] px-4 py-2.5 font-nunito text-[14px] text-[#2c4f63] outline-none focus:ring-2 focus:ring-[#6fcccb]"
          >
            {PERSONA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-[0_8px_22px_-16px_rgba(80,140,150,0.8)]">
          <SectionTitle>Batasan Topik</SectionTitle>
          <p className="font-nunito text-[13px] text-[#8aa0a3] mb-3">
            Jelaskan topik yang sebaiknya dihindari saat AI Companion berbicara dengan anak.
          </p>
          <textarea
            data-testid={AI_COMPANION_SETTINGS.topicRestrictionsInput}
            value={topicRestrictions}
            onChange={(event) => setTopicRestrictions(event.target.value)}
            rows={4}
            placeholder="Contoh: hindari membahas kematian, perceraian orang tua, dsb."
            className="w-full rounded-xl border border-[#e7eef0] px-4 py-2.5 font-nunito text-[14px] text-[#2c4f63] outline-none focus:ring-2 focus:ring-[#6fcccb] resize-none"
          />
        </section>

        <div className="flex items-center gap-3">
          <button
            data-testid={AI_COMPANION_SETTINGS.saveButton}
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#6fcccb] text-white px-5 py-2.5 font-nunito font-bold text-[14px] hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
          {saveMessage && <p className="font-nunito text-[13px] text-[#3aa0a0]">{saveMessage}</p>}
          {saveError && <p className="font-nunito text-[13px] text-[#eb5757]">{saveError}</p>}
        </div>

        <section className="bg-white rounded-2xl p-5 shadow-[0_8px_22px_-16px_rgba(80,140,150,0.8)]">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-[#2c4f63]" />
            <SectionTitle>Riwayat Chat per Sesi</SectionTitle>
          </div>
          {sessionsLoading && (
            <p className="font-nunito text-[13px] text-[#8aa0a3]">Memuat riwayat chat...</p>
          )}
          {sessionsError && <p className="font-nunito text-[13px] text-[#eb5757]">{sessionsError}</p>}
          {!sessionsLoading && !sessionsError && sessions.length === 0 && (
            <p className="font-nunito text-[13px] text-[#8aa0a3]">
              Belum ada sesi percakapan dengan AI Companion.
            </p>
          )}
          <div data-testid={AI_COMPANION_SETTINGS.sessionList} className="space-y-3">
            {sessions.map((session) => {
              const isExpanded = expandedSessionId === session.conversationId;
              return (
                <div
                  key={session.conversationId}
                  className="rounded-xl border border-[#e7eef0] px-4 py-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-nunito font-bold text-[13px] text-[#2c4f63]">
                      {formatSessionDate(session.createdAt)}
                    </span>
                    <span className="font-nunito text-[11px] text-[#8aa0a3] bg-[#f4f6f7] rounded-full px-2.5 py-0.5">
                      {session.messageCount} pesan
                    </span>
                  </div>
                  <p className="font-nunito text-[13px] text-[#4c6a70] leading-relaxed">
                    {session.summary}
                  </p>
                  <button
                    onClick={() => setExpandedSessionId(isExpanded ? null : session.conversationId)}
                    className="self-start flex items-center gap-1 font-nunito text-[12px] font-bold text-[#3aa0a0] hover:text-[#2c7d7d] transition-colors"
                  >
                    {isExpanded ? "Sembunyikan percakapan" : "Lihat percakapan lengkap"}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-2 rounded-lg bg-[#f4f6f7] p-3 max-h-72 overflow-y-auto">
                      {session.messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-1.5 font-nunito text-[13px] whitespace-pre-wrap ${
                              message.role === "user"
                                ? "bg-[#ffb066] text-[#4a2c00]"
                                : "bg-[#6fcccb] text-white"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AICompanionSettingsPage;
