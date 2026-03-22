"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "Checklist Documenti", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { label: "Analisi AI Fido", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { label: "Tempi Valutazione", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { label: "Bilancio XBRL", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18l-8-4-8 4z"/></svg> },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Benvenuto nel terminale **METIS**. Sono il tuo assistente agentico per l'onboarding e la delibera del credito.\n\nSto monitorando il portafoglio in tempo reale. Posso aiutarti a caricare i documenti, spiegarti le metriche di rischio o fornirti un report preliminare sulla solvibilità di specifiche pratiche.\n\nCosa desideri approfondire?",
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
      setMessages([...newMessages, { role: "assistant", content: "Errore nel protocollo di comunicazione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">$1</strong>')
      .replace(/\n/g, '<br/>');
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
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan to-purple flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.35)] animate-pulse">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#090D14] border border-white/10 flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_#00FF66]" />
              </div>
            </div>
            <div>
              <h1 className="font-space text-base font-bold text-white tracking-[0.2em] uppercase">METIS <span className="text-cyan/70 font-normal ml-2">v2.0</span></h1>
              <p className="text-[10px] text-text-muted font-space tracking-widest uppercase">Agentic Credit Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end mr-4">
               <span className="text-[9px] font-space text-text-muted uppercase tracking-[0.2em]">Status</span>
               <span className="text-[10px] font-space text-green uppercase tracking-widest flex items-center gap-1.5">
                 <span className="w-1 h-1 rounded-full bg-green animate-ping" /> Synchronized
               </span>
             </div>
             <span className="text-[10px] font-space border border-cyan/30 text-cyan bg-cyan/5 px-4 py-1.5 rounded-lg uppercase tracking-widest font-bold">Secure Session</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Conversational Engine */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-6 max-w-4xl mx-auto animate-[fadeUp_0.5s_ease-out_forwards] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar Section */}
                  <div className="shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      msg.role === "assistant"
                        ? "bg-black/40 border border-cyan/30 text-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                        : "bg-white/5 border border-white/10 text-white/40"
                    }`}>
                      {msg.role === "assistant" ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      )}
                    </div>
                  </div>

                  {/* Bubble Section */}
                  <div className={`flex-1 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-3 mb-2 px-1">
                       <span className="text-[10px] font-space uppercase tracking-widest text-text-muted">
                         {msg.role === "assistant" ? "METIS Copilot" : "Commercial Officer"}
                       </span>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="text-[9px] text-white/20 font-space">
                         {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    <div className={`relative px-6 py-5 rounded-2xl text-[14px] leading-relaxed group transition-all duration-300 ${
                      msg.role === "assistant"
                        ? "bg-[rgba(14,21,33,0.4)] backdrop-blur-md border border-white/5 text-[#F1F5F9] hover:border-cyan/20 cursor-default"
                        : "bg-cyan/5 border border-cyan/20 text-white"
                    }`}>
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      
                      {msg.role === "assistant" && (
                         <div className="absolute top-0 left-0 w-1 h-full bg-cyan/40 rounded-l-2xl" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-6 max-w-4xl mx-auto items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                  </div>
                  <span className="text-xs font-space uppercase tracking-widest text-cyan/50 italic">Processore Quantistico in esecuzione...</span>
                </div>
              )}
              <div ref={bottomRef} className="h-10" />
            </div>

            {/* Float Input Bar */}
            <div className="max-w-4xl w-full mx-auto px-10 pb-10 mt-auto shrink-0 relative z-20">
               {/* Suggestions Container */}
               {messages.length < 3 && (
                <div className="flex gap-3 mb-6 flex-wrap justify-center">
                  {QUICK_ACTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q.label)}
                      className="group flex items-center gap-2.5 text-[11px] font-space border border-white/10 text-text-muted hover:text-cyan hover:border-cyan/40 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                      <span className="text-white/30 group-hover:text-cyan transition-colors">{q.icon}</span>
                      <span className="uppercase tracking-widest">{q.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan/20 to-purple/20 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500" />
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                  className="relative flex items-center gap-4 bg-[rgba(9,13,20,0.85)] backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl transition-all duration-300">
                  <div className="flex-1 flex items-center px-4">
                     <svg className="w-5 h-5 text-white/20 mr-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                     <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Interroga METIS per estensione fidi o analisi rischio..."
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
              <div className="flex items-center justify-center gap-4 mt-4">
                <p className="text-[9px] text-text-muted font-space uppercase tracking-[0.2em] opacity-40">FINOMNIA SECURE LAYER v2</p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[9px] text-text-muted font-space uppercase tracking-[0.2em] opacity-40 italic">Agentic Glass-Box Core</p>
              </div>
            </div>
          </div>

          {/* Side Audit Panel */}
          <div className="w-[380px] border-l border-white/5 bg-[rgba(14,21,33,0.3)] backdrop-blur-3xl flex flex-col shrink-0">
             
             {/* Section: Checklist */}
             <div className="p-8 border-b border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-space text-xs font-bold tracking-[0.3em] uppercase text-cyan drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">AUDIT TRAIL</h3>
                  <span className="text-[9px] font-space text-text-muted uppercase border border-white/10 px-2 py-0.5 rounded">EU AI ACT</span>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: "Bilancio Aziendale", status: "WAITING", type: "XBRL" },
                    { label: "Visura Camerale", status: "READY", type: "PDF" },
                    { label: "Centrale Rischi", status: "WAITING", type: "DATA" },
                    { label: "Check Compliance ESG", status: "READY", type: "AUTO" },
                  ].map((doc, i) => (
                    <div key={i} className="group relative">
                      <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${
                        doc.status === "READY" 
                          ? "bg-green/5 border-green/20 hover:border-green/50" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/20"
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                          doc.status === "READY" ? "border-green/20 text-green" : "border-white/10 text-white/20"
                        }`}>
                          {doc.status === "READY" ? (
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${doc.status === "READY" ? "text-green/70" : "text-white/40"}`}>{doc.label}</p>
                          <span className="text-[9px] font-space text-text-muted/50 tracking-widest">{doc.type} · {doc.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Section: Process Flow */}
             <div className="p-8">
                <h3 className="font-space text-[10px] tracking-[0.3em] uppercase text-text-muted mb-8">Processo Decisionale</h3>
                <div className="space-y-6">
                  {[
                    { label: "Document Ingestion", active: true, completed: true },
                    { label: "Explainable AI (METIS)", active: true, completed: false },
                    { label: "Underwriter Review", active: false, completed: false },
                    { label: "Credit Approval", active: false, completed: false },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          step.completed ? "bg-cyan border-cyan text-void" : 
                          step.active ? "border-cyan text-cyan shadow-[0_0_10px_rgba(0,229,255,0.3)] animate-pulse" : 
                          "border-white/10 text-white/20"
                        }`}>
                          {step.completed ? (
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <span className="text-[9px] font-bold">{i + 1}</span>
                          )}
                        </div>
                        {i < 3 && <div className={`w-0.5 h-6 rounded-full ${step.completed ? "bg-cyan/40" : "bg-white/5"}`} />}
                      </div>
                      <div className="flex-1 py-0.5">
                         <span className={`text-[11px] font-space uppercase tracking-[0.15em] transition-all duration-300 ${
                           step.active ? "text-white font-bold" : "text-white/20"
                         }`}>
                           {step.label}
                         </span>
                         {step.active && !step.completed && (
                           <div className="flex items-center gap-2 mt-2">
                              <span className="text-[8px] font-space text-cyan uppercase tracking-widest animate-pulse">Running analysis...</span>
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Safety Prompt */}
                <div className="mt-12 p-4 bg-void border border-white/5 rounded-xl">
                   <p className="text-[9px] text-text-muted/40 font-inter leading-relaxed text-center">
                     I modelli di Metis operano in modalità <strong>Human-in-the-loop</strong>. Ogni delibera richiede conferma formale.
                   </p>
                </div>
             </div>

          </div>
        </div>
      </div>
    </main>
  );
}
