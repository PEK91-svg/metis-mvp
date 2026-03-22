"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: Array<{ action: string; url: string; label: string; id?: number }>;
};

// Context injected by the Dossier page when navigating to Copilot
export interface DossierContext {
  companyName: string;
  altmanZ?: number;
  pd?: string;
  dscr?: string;
  riskLabel?: string;
  sector?: string;
}

const QUICK_ACTIONS = [
  { label: "Pratiche ad alto rischio", prompt: "Quali pratiche hanno rischio ALTO o CRITICO?" },
  { label: "KPI portafoglio", prompt: "Dammi le KPI aggregate del portafoglio" },
  { label: "Analizza Beta Ltd.", prompt: "Dammi il profilo completo di Beta Ltd." },
  { label: "Pratiche in analisi", prompt: "Elenca le pratiche in stato IN ANALISI" },
  { label: "Soglia PD critica", prompt: "Quali pratiche hanno PD superiore al 5%?" },
  { label: "Apri dossier Delta Corp.", prompt: "Apri il dossier di Delta Corp." },
];

export default function CopilotPage() {
  const router = useRouter();

  // Read dossier context from sessionStorage (set by dossier page when navigating here)
  const [dossierCtx] = useState<DossierContext | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("metis_dossier_ctx");
      return raw ? JSON.parse(raw) as DossierContext : null;
    } catch { return null; }
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: dossierCtx
        ? `Benvenuto. Sono **METIS**.\n\nHo caricato il dossier di **${dossierCtx.companyName}** — ecco cosa so al momento:\n• Altman Z-Score: **${dossierCtx.altmanZ ?? 'N/A'}**\n• PD: **${dossierCtx.pd ?? 'N/A'}**\n• DSCR: **${dossierCtx.dscr ?? 'N/A'}**\n• Giudizio: **${dossierCtx.riskLabel ?? 'N/A'}**\n\nPosso analizzare ulteriormente il rischio, confrontare con il settore ${dossierCtx.sector ?? ''} o suggerire azioni. Cosa vuoi approfondire?`
        : "Benvenuto. Sono **METIS**, il tuo assistente agentico per il credit underwriting.\n\nHo accesso diretto al portafoglio in tempo reale: posso cercare pratiche, analizzare rischi, produrre KPI aggregate e navigare la piattaforma per te.\n\nCosa vuoi analizzare?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setAgentStep("Analisi in corso...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, dossierContext: dossierCtx }),
      });
      const data = await res.json();
      setMessages([...newMessages, {
        role: "assistant",
        content: data.reply,
        actions: data.actions,
      }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Errore nel protocollo di comunicazione. Riprova." }]);
    } finally {
      setLoading(false);
      setAgentStep(null);
    }
  }, [messages, loading]);

  // Renders markdown-like text as safe React elements
  const formatMessage = (text: string): React.ReactNode[] => {
    return text.split("\n").flatMap((line, lineIdx, lines) => {
      const parts: React.ReactNode[] = [];
      // Bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      let last = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > last) parts.push(line.slice(last, match.index));
        parts.push(
          <strong key={`b-${lineIdx}-${match.index}`} className="text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
            {match[1]}
          </strong>
        );
        last = match.index + match[0].length;
      }
      if (last < line.length) parts.push(line.slice(last));
      if (lineIdx < lines.length - 1) parts.push(<br key={`br-${lineIdx}`} />);
      return parts;
    });
  };

  return (
    <main className="flex h-screen w-screen bg-[#090D14] overflow-hidden text-[#F1F5F9] font-inter">
      {/* Background Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,229,255,0.05),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(123,44,191,0.05),_transparent_50%)] pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
        {/* Header */}
        <header className="h-[70px] border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(0,229,255,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/metis-icon.png" alt="Metis AI" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#090D14] border border-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_#00FF66]" />
              </div>
            </div>
            <div>
              <h1 className="font-space text-base font-bold text-white tracking-[0.2em] uppercase">METIS <span className="text-cyan/70 font-normal ml-2">Agentic AI</span></h1>
              <p className="text-[10px] text-text-muted font-space tracking-widest uppercase">Credit Intelligence · Function Calling · Glass-Box</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[9px] font-space text-text-muted uppercase tracking-[0.2em]">Status</span>
              <span className="text-[10px] font-space text-green uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green animate-ping" /> Synchronized
              </span>
            </div>
            {/* Agent step indicator */}
            {agentStep && (
              <div className="flex items-center gap-2 text-[10px] font-space text-cyan/60 border border-cyan/20 bg-cyan/5 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-ping" />
                {agentStep}
              </div>
            )}
            <span className="text-[10px] font-space border border-cyan/30 text-cyan bg-cyan/5 px-4 py-1.5 rounded-lg uppercase tracking-widest font-bold">Secure Session</span>
          </div>
        </header>

        {/* Chat area — full width */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-10 space-y-8 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-6 max-w-5xl mx-auto animate-[fadeUp_0.5s_ease-out_forwards] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className="shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    msg.role === "assistant"
                      ? "bg-black/40 border border-cyan/30 text-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                      : "bg-white/5 border border-white/10 text-white/40"
                  }`}>
                    {msg.role === "assistant" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/metis-icon.png" alt="Metis AI" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    )}
                  </div>
                </div>

                {/* Bubble */}
                <div className={`flex-1 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-[10px] font-space uppercase tracking-widest text-text-muted">
                      {msg.role === "assistant" ? "METIS Agentic" : "Commercial Officer"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] text-white/20 font-space" suppressHydrationWarning>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`relative px-6 py-5 rounded-2xl text-[14px] leading-relaxed group transition-all duration-300 ${
                    msg.role === "assistant"
                      ? "bg-[rgba(14,21,33,0.4)] backdrop-blur-md border border-white/5 text-[#F1F5F9] hover:border-cyan/20"
                      : "bg-cyan/5 border border-cyan/20 text-white"
                  }`}>
                    <div>{formatMessage(msg.content)}</div>
                    {msg.role === "assistant" && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan/40 rounded-l-2xl" />
                    )}
                  </div>

                  {/* Action Cards — navigation suggestions from Metis */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-1">
                      {msg.actions.map((act, ai) => (
                        <button
                          key={ai}
                          onClick={() => router.push(act.url)}
                          className="group flex items-center gap-2 text-[11px] font-space border border-cyan/30 text-cyan bg-cyan/5 hover:bg-cyan/15 hover:border-cyan/60 px-4 py-2 rounded-xl transition-all duration-200 shadow-[0_0_12px_rgba(0,229,255,0.05)] hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          <span className="uppercase tracking-widest">{act.label}</span>
                          <span className="text-cyan/40 text-[9px]">{act.url}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-6 max-w-5xl mx-auto items-start">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-cyan/20 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="px-6 py-4 rounded-2xl bg-[rgba(14,21,33,0.4)] border border-white/5 border-l-2 border-l-cyan/40">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-cyan/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                      <span className="text-xs font-space uppercase tracking-widest text-cyan/50 italic">
                        {agentStep || "Elaborazione in corso..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Input Bar */}
          <div className="max-w-5xl w-full mx-auto px-10 pb-8 mt-auto shrink-0 relative z-20">
            {/* Quick Actions */}
            {messages.length < 2 && (
              <div className="flex gap-2 mb-5 flex-wrap justify-center">
                {QUICK_ACTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q.prompt)}
                    className="flex items-center gap-2 text-[11px] font-space border border-white/10 text-text-muted hover:text-cyan hover:border-cyan/40 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(0,229,255,0.1)] uppercase tracking-widest">
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan/20 to-purple/20 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500" />
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="relative flex items-center gap-4 bg-[rgba(9,13,20,0.85)] backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl transition-all duration-300">
                <div className="flex-1 flex items-center px-4">
                  <svg className="w-5 h-5 text-white/20 mr-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Chiedi a METIS: analisi rischio, cerca pratiche, KPI portafoglio..."
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20 font-medium"
                  />
                </div>
                <button type="submit" disabled={loading || !input.trim()}
                  className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    input.trim() ? "bg-cyan text-void shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:scale-105 active:scale-95" : "bg-white/5 text-white/20"
                  }`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <p className="text-[9px] text-text-muted font-space uppercase tracking-[0.2em] opacity-40">FINOMNIA SECURE LAYER v2</p>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <p className="text-[9px] text-text-muted font-space uppercase tracking-[0.2em] opacity-40 italic">Gemini Function Calling · Agentic Glass-Box Core</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
