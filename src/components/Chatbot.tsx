import { useEffect, useRef, useState } from "react";
import { FAQ_LIST, findFaq, matchFaq, type FaqEntry } from "../lib/chatbotFaq";
import { vibrate } from "../lib/haptic";

interface Message {
  id: number;
  role: "user" | "bot";
  text: string;
  /** Follow-up FAQ IDs to render as quick replies (bot messages only). */
  suggestions?: string[];
}

const GREETING: Message = {
  id: 0,
  role: "bot",
  text:
    "Ciao! Sono il Chatbot del Comitato 🤖\n\n" +
    "Posso aiutarti con installazione, compilazione della schedina, regolamento, problemi. Tocca una domanda qui sotto o scrivimi!",
  suggestions: ["install-android", "come-entrare", "compilare", "punti", "scadenza"],
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Lock body scroll when the chatbot is open on mobile
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const pushUser = (text: string) => {
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
  };

  const pushBot = (entry: FaqEntry | null, userInput?: string) => {
    setTyping(true);
    // Small delay so the "typing" feedback feels natural
    setTimeout(() => {
      if (entry) {
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "bot",
            text: entry.answer,
            suggestions: entry.followups,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "bot",
            text:
              `Non ho trovato una risposta pronta per "${userInput ?? "la tua domanda"}".\n\n` +
              "Prova a riformulare, oppure scegli una delle domande qui sotto. Se proprio non trovi quello che cerchi, scrivi direttamente al Comitato.",
            suggestions: ["install-android", "compilare", "punti", "problema-tecnico"],
          },
        ]);
      }
      setTyping(false);
    }, 450);
  };

  const handleQuickReply = (faqId: string) => {
    vibrate("tap");
    const entry = findFaq(faqId);
    if (!entry) return;
    pushUser(entry.question);
    pushBot(entry);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    vibrate("tap");
    pushUser(text);
    setInput("");
    const match = matchFaq(text);
    pushBot(match, text);
  };

  const handleReset = () => {
    setMessages([{ ...GREETING, id: nextId.current++ }]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => {
            vibrate("tap");
            setOpen(true);
          }}
          aria-label="Apri chatbot"
          className="fixed rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            right: 16,
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, #00d4ff, #0099cc)",
            color: "#040810",
            fontSize: 24,
            boxShadow: "0 6px 24px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 212, 255, 0.2)",
            zIndex: 40,
          }}
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(4, 8, 16, 0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="glass w-full sm:max-w-md flex flex-col animate-in"
            style={{
              height: "85vh",
              maxHeight: 680,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              border: "1px solid rgba(0,212,255,0.3)",
              boxShadow: "0 0 40px rgba(0,212,255,0.1)",
              overflow: "hidden",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,212,255,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #00d4ff, #0099cc)",
                    fontSize: 22,
                  }}
                >
                  🤖
                </div>
                <div>
                  <h3
                    className="text-sm font-black"
                    style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}
                  >
                    Comitato Bot
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--correct)" }}>
                    ● Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  aria-label="Reset conversazione"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                  title="Ricomincia"
                >
                  ↻
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Chiudi chatbot"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ scrollBehavior: "smooth" }}
            >
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2 animate-in">
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        maxWidth: "85%",
                        background:
                          msg.role === "user"
                            ? "linear-gradient(135deg, #00d4ff, #0099cc)"
                            : "rgba(255, 255, 255, 0.06)",
                        color: msg.role === "user" ? "#040810" : "var(--text-primary)",
                        borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                        borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                        whiteSpace: "pre-wrap",
                        fontFamily: "DM Sans, sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {msg.role === "bot" && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {msg.suggestions.map((fid) => {
                        const f = findFaq(fid);
                        if (!f) return null;
                        return (
                          <button
                            key={fid}
                            onClick={() => handleQuickReply(fid)}
                            className="text-[11px] px-2.5 py-1.5 rounded-full transition-all"
                            style={{
                              background: "rgba(0, 212, 255, 0.1)",
                              border: "1px solid rgba(0, 212, 255, 0.3)",
                              color: "var(--accent)",
                              fontFamily: "Outfit, sans-serif",
                              fontWeight: 600,
                            }}
                          >
                            {f.question}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm inline-flex gap-1"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      borderBottomLeftRadius: 4,
                    }}
                    aria-label="Sto scrivendo..."
                  >
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            {/* Full FAQ list (collapsible) */}
            {messages.length <= 1 && (
              <div
                className="px-4 py-2"
                style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.15)" }}
              >
                <details>
                  <summary
                    className="text-[10px] uppercase tracking-wider cursor-pointer py-1"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    📚 Vedi tutte le domande
                  </summary>
                  <div className="flex flex-wrap gap-1 mt-2 pb-2 max-h-32 overflow-y-auto">
                    {FAQ_LIST.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleQuickReply(f.id)}
                        className="text-[10px] px-2 py-1 rounded-full transition-all"
                        style={{
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                          fontFamily: "Outfit, sans-serif",
                        }}
                      >
                        {f.question}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 px-4 py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi la tua domanda..."
                maxLength={200}
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-[#475569] focus:outline-none"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: input.trim()
                    ? "linear-gradient(135deg, #00d4ff, #0099cc)"
                    : "rgba(255,255,255,0.05)",
                  color: input.trim() ? "#040810" : "var(--text-muted)",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Invia
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
