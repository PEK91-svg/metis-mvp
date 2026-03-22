"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

const INIT_MSG: Msg = {
  role: "assistant",
  content:
    "[DASHBOARD CONTEXT]\nSto monitorando il portafoglio completo: 18 pratiche attive, con rischi distribuiti su Altman Z-Score medio 2.8x e PD media 3.6%.\n\nCome posso aiutarti ad analizzare il portafoglio oggi?",
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

export function MetisChatWidget() {
  const [msgs, setMsgs] = useState<Msg[]>([INIT_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Errore di comunicazione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  }, [msgs, loading]);

  const QUICK = ["Rischio portafoglio?", "Pratiche in analisi", "Pratiche ad alto rischio"];

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Sub-header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/metis-icon.png" alt="Metis AI" className="w-full h-full object-cover" />
          </div>
          <span className="text-[9px] font-space uppercase tracking-widest text-text-muted">Agentic AI · LIVE</span>
        </div>
        <Link
          href="/copilot"
          className="text-[8px] font-space uppercase tracking-widest text-text-muted hover:text-cyan border border-white/10 hover:border-cyan/30 px-2 py-0.5 rounded transition"
        >
          Apri completo →
        </Link>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent] min-h-0">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`text-[11px] leading-relaxed px-3 py-2.5 rounded-xl ${
              m.role === "assistant"
                ? "bg-black/30 border border-white/5 border-l-2 border-l-cyan/50 text-white/85"
                : "bg-cyan/5 border border-cyan/20 text-white ml-6"
            }`}
          >
            {formatMsg(m.content)}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[9px] font-space text-cyan/40 uppercase tracking-widest italic">elaborazione...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {msgs.length < 3 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-[9px] font-space border border-white/10 text-white/40 hover:text-cyan hover:border-cyan/30 px-2.5 py-1 rounded-full transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi a Metis..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-cyan/30 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            input.trim()
              ? "bg-cyan/20 text-cyan border border-cyan/40 hover:bg-cyan/30"
              : "bg-white/5 text-white/20 border border-white/5"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
