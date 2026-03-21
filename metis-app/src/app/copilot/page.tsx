"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  "Di quali documenti ho bisogno?",
  "Come funziona l'analisi AI?",
  "Quanto tempo richiede la valutazione?",
  "Come si presenta un bilancio XBRL?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Ciao! Sono **ARIA**, il tuo assistente AI per la richiesta di fido su Metis.\n\nSono qui per guidarti in ogni fase del processo, dal caricamento dei documenti fino all'esito finale della tua pratica.\n\nCome posso aiutarti oggi?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "❌ Errore di connessione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden text-text-main font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,229,255,0.07),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(123,44,191,0.07),_transparent_50%)] pointer-events-none" />
      
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <h1 className="font-space text-sm font-bold text-white tracking-widest">ARIA AI COPILOT</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green animate-pulse shadow-[0_0_6px_var(--color-green)]" />
                <span className="text-[10px] text-text-muted font-space tracking-wider">Assistente Onboarding Fido · Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-space border border-purple/40 text-purple bg-purple/10 px-3 py-1 rounded-full uppercase tracking-widest">Powered by Gemini AI</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-cyan to-purple shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                      : "bg-white/10 border border-white/20"
                  }`}>
                    {msg.role === "assistant" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    )}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-black/40 border border-white/10 text-text-main rounded-tl-none"
                      : "bg-cyan/10 border border-cyan/30 text-white rounded-tr-none"
                  }`} dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                  </div>
                  <div className="bg-black/40 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 rounded-full bg-cyan animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Actions */}
            {messages.length < 3 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="text-[11px] font-space border border-white/15 text-text-muted hover:text-cyan hover:border-cyan/50 bg-white/5 hover:bg-cyan/5 px-3 py-1.5 rounded-full transition">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-6 pb-6 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex gap-3 bg-black/50 border border-white/15 rounded-2xl p-2 focus-within:border-cyan/50 transition">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Scrivi un messaggio ad ARIA..."
                  className="flex-1 bg-transparent text-sm text-white outline-none px-3 placeholder:text-white/30"
                />
                <button type="submit" disabled={loading || !input.trim()}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    input.trim() ? "bg-gradient-to-br from-cyan to-purple shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)]" : "bg-white/5"
                  }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
              <p className="text-[10px] text-text-muted text-center mt-2 font-space">ARIA può sbagliare. Le decisioni finali spettano sempre agli operatori bancari.</p>
            </div>
          </div>

          {/* Info Panel */}
          <div className="w-80 border-l border-white/10 bg-black/20 flex flex-col p-5 gap-5 overflow-y-auto">
            <div>
              <h3 className="font-space text-[10px] tracking-widest uppercase text-text-muted mb-3">Documenti Richiesti</h3>
              <div className="space-y-2">
                {[
                  { label: "Bilancio Aziendale (XBRL / PDF)", done: false, icon: "📄" },
                  { label: "Visura Camerale", done: false, icon: "🏛" },
                  { label: "Centrale Rischi Bankitalia", done: false, icon: "🏦" },
                  { label: "Ultime 3 dichiarazioni IVA", done: false, icon: "🧾" },
                ].map((doc, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition ${doc.done ? "border-green/30 bg-green/5 text-green" : "border-white/10 bg-white/5 text-text-muted"}`}>
                    <span>{doc.icon}</span>
                    <span className="text-[11px] leading-snug">{doc.label}</span>
                    {doc.done && <svg className="w-4 h-4 ml-auto shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-space text-[10px] tracking-widest uppercase text-text-muted mb-3">Fasi della Pratica</h3>
              <div className="space-y-2">
                {[
                  { label: "Raccolta Documenti", active: true },
                  { label: "Analisi AI (OCR + Scoring)", active: false },
                  { label: "Review Comitato", active: false },
                  { label: "Delibera Finale", active: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${step.active ? "border-cyan bg-cyan/20 text-cyan" : "border-white/20 text-white/30"}`}>{i + 1}</div>
                    <span className={`text-[11px] ${step.active ? "text-cyan" : "text-text-muted"}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
