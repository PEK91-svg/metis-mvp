"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

const INIT_MSG: Msg = {
  role: "assistant",
  content: "Ciao come posso aiutarti?",
};

function formatMsg(text: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="text-cyan font-semibold">{part.slice(2, -2)}</strong>
        ) : part
      )}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export function GlobalChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([INIT_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // --- Drag state stored as fixed position from viewport edge ---
  const [pos, setPos] = useState({ bottom: 24, right: 24 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, bottom: 24, right: 24 });

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: pos.bottom,
      right: pos.right,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
      setPos({
        right: Math.max(8, dragStart.current.right - dx),
        bottom: Math.max(8, dragStart.current.bottom - dy),
      });
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleFabClick = () => {
    if (hasDragged.current) return;
    setIsOpen(!isOpen);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isCopilotPage = pathname === "/copilot";

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnread(false);
    }
  }, [msgs, loading, isOpen]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    if (!isOpen) setIsOpen(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      if (!isOpen) setHasUnread(true);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Errore di connessione a Metis Core. Riprova." }]);
    } finally {
      setLoading(false);
    }
  }, [msgs, loading, isOpen]);

  const QUICK = ["Portafoglio Rischio", "Sintesi Dossier Alpha", "Verifica EBA Dashboard"];

  if (isCopilotPage) return null;

  return (
    <div
      className="fixed z-[9999] flex flex-col items-end pointer-events-none select-none"
      style={{ bottom: pos.bottom, right: pos.right }}
    >
      {/* Popover Chat Interface */}
      <div
        className={`pointer-events-auto bg-[#0A0F14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-right mb-4 ${
          isOpen ? "opacity-100 scale-100 w-[380px] h-[550px]" : "opacity-0 scale-95 w-[380px] h-[0px] border-none"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-black/80 to-black/40 border-b border-white/10 p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <img src="/metis-m-logo.png" alt="Metis AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-space font-bold text-sm tracking-wider">METIS AI</div>
              <div className="text-cyan text-[9px] font-space uppercase tracking-[0.2em] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse shadow-[0_0_8px_var(--color-cyan)]" /> Interceptor Live
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/copilot"
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
              title="Apri a Schermo Intero"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-red/20 text-white/50 hover:text-red transition"
              title="Chiudi"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`text-[12px] leading-relaxed px-4 py-3 rounded-2xl ${
                m.role === "assistant"
                  ? "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm w-[90%]"
                  : "bg-cyan/10 border border-cyan/30 text-white rounded-tr-sm ml-auto w-[85%]"
              }`}
            >
              {formatMsg(m.content)}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 w-[80%]">
              <div className="flex gap-1.5 bg-black/40 px-3 py-2 rounded-full border border-white/5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="p-3 bg-black/60 border-t border-white/10 shrink-0">
          {msgs.length < 3 && (
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="whitespace-nowrap text-[10px] font-space border border-white/10 bg-white/5 text-white/60 hover:text-cyan hover:border-cyan/40 hover:bg-cyan/5 px-3 py-1.5 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Invia comando a Metis AI..."
              className="flex-1 bg-[#0A0F14] border border-white/20 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-cyan/50 focus:bg-white/5 transition resize-none leading-relaxed"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg ${
                input.trim() ? "bg-cyan text-black hover:bg-[#00cce6]" : "bg-white/10 text-white/30"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onMouseDown={handleMouseDown}
        onClick={handleFabClick}
        className={`pointer-events-auto relative flex items-center justify-center w-[60px] h-[60px] rounded-full border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-[box-shadow,border-color,transform] duration-300 overflow-hidden cursor-grab active:cursor-grabbing ${
          isOpen ? "bg-[#0A0F14] rotate-90 scale-90" : "hover:scale-105 hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:border-white/40"
        }`}
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-white z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <img src="/ai_widget_icon.png" alt="Toggle AI Chat" className="w-full h-full object-cover z-10" />
        )}
        {!isOpen && hasUnread && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red rounded-full border-2 border-[#0A0F14] animate-pulse z-20" />
        )}
      </button>
    </div>
  );
}
