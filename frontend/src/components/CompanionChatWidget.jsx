import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API, authConfig } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AI_COMPANION } from "../constants/testIds";

const MessageBubble = ({ role, content }) => {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 font-nunito text-[13px] whitespace-pre-wrap ${
          isUser
            ? "bg-[#6fcccb] text-white rounded-br-sm"
            : "bg-[#f4f6f7] text-[#2c4f63] rounded-bl-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

// Floating AI Companion text chat, kept on the Home page after the dedicated
// /companion page switched to a voice + VRM avatar experience.
const CompanionChatWidget = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!open || !token) return;
    fetch(`${API}/companion/history`, authConfig(token))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setMessages(data.messages || []))
      .catch(() => setError("Riwayat percakapan belum dapat dimuat."));
  }, [open, token]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !token) return;
    setSending(true);
    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      const response = await fetch(`${API}/companion/chat`, {
        ...authConfig(token),
        method: "POST",
        headers: { ...authConfig(token).headers, "Content-Type": "application/json" },
        // Home widget is parent-facing: allowed to report concrete progress data.
        body: JSON.stringify({ message: text, audience: "parent" }),
      });
      if (!response.ok) throw new Error("Gagal mengirim pesan");
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Luna Help belum dapat membalas, coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!token) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          data-testid={AI_COMPANION.chatContainer}
          className="w-[90vw] max-w-[340px] h-[440px] bg-white rounded-3xl shadow-[0_16px_40px_-16px_rgba(80,140,150,0.9)] ring-1 ring-[#e7eef0] flex flex-col overflow-hidden"
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#eef2f2]">
            <div>
              <h2 className="font-fredoka font-semibold text-[15px] text-[#2c4f63]">Luna Help</h2>
              <p className="font-nunito text-[11px] text-[#8aa0a3]">Tanya seputar belajar anak</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/companion/settings")}
                aria-label="Pengaturan Luna Help"
                className="text-[#8aa0a3] hover:text-[#2c4f63]"
              >
                <Settings size={17} />
              </button>
              <button onClick={() => setOpen(false)} className="text-[#8aa0a3] hover:text-[#2c4f63]">
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            data-testid={AI_COMPANION.messageList}
            className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-2.5"
          >
            {messages.length === 0 && !error && (
              <p className="font-nunito text-[12px] text-[#8aa0a3] text-center mt-6">
                Mulai percakapan dengan Luna Help.
              </p>
            )}
            {messages.map((message, index) => (
              <MessageBubble key={message.id || index} role={message.role} content={message.content} />
            ))}
            {error && <p className="font-nunito text-[12px] text-[#eb5757] text-center">{error}</p>}
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-t border-[#eef2f2]">
            <input
              data-testid={AI_COMPANION.messageInput}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Tulis pesan..."
              className="flex-1 rounded-full bg-[#f4f6f7] px-3.5 py-2 font-nunito text-[13px] text-[#2c4f63] outline-none focus:ring-2 focus:ring-[#6fcccb] disabled:opacity-60"
            />
            <button
              data-testid={AI_COMPANION.sendButton}
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="shrink-0 h-9 w-9 rounded-full bg-[#6fcccb] text-white flex items-center justify-center hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        data-testid={AI_COMPANION.widgetToggle}
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-[#6fcccb] text-white shadow-[0_10px_24px_-8px_rgba(90,180,180,0.9)] flex items-center justify-center hover:brightness-105 transition-all"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
};

export default CompanionChatWidget;
