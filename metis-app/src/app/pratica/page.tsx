"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { STATUS_CONFIG } from "@/lib/companyConfig";
import type { Status } from "@/lib/companyConfig";

// ─── Types ──────────────────────────────────────────────────────────────────
type DocStatus = "uploaded" | "missing" | "error";

interface RequiredDoc {
  name: string;
  description: string;
  status: DocStatus;
  uploadedAt?: string;
  fileName?: string;
}

interface CompanyData {
  id: number;
  name: string;
  piva: string;
  status: Status;
  sector: string;
  revenue: number;
  pd: number;
  altman: number;
  risk: string;
  operator: string;
  documents: RequiredDoc[];
  lat?: number;
  lng?: number;
  indirizzo?: string;
}

// ─── Mock ───────────────────────────────────────────────────────────────────
const REQUIRED_DOCS: RequiredDoc[] = [
  { name: "Bilancio XBRL", description: "Ultimo bilancio depositato in formato XBRL", status: "missing" },
  { name: "Centrale Rischi", description: "Segnalazione CR Bankitalia (ultimi 12 mesi)", status: "missing" },
  { name: "Visura Camerale", description: "Visura aggiornata da Camera di Commercio", status: "missing" },
  { name: "Report Cerved", description: "Rating e report Cerved/CRIF aggiornato", status: "missing" },
  { name: "Modello Unico", description: "Ultima dichiarazione dei redditi", status: "missing" },
  { name: "Piano Business", description: "Business plan o piano industriale", status: "missing" },
];

const MOCK_COMPANIES: Record<number, CompanyData> = {
  1:  { id: 1,  name: "Alpha S.p.A.",       piva: "IT00000000001", status: "APPROVATA",      sector: "Manifatturiero", revenue: 15400000, pd: 2.1,  altman: 3.12, risk: "BASSO",   operator: "M. Rossi",   lat: 45.4718, lng: 9.1895, indirizzo: "Via Montenapoleone 3, Milano",
        documents: REQUIRED_DOCS.map(d => ({ ...d, status: "uploaded" as DocStatus, uploadedAt: "2025-01-20", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_alpha.pdf` })) },
  2:  { id: 2,  name: "Beta Ltd.",          piva: "IT00000000002", status: "IN ANALISI",     sector: "Servizi",        revenue: 8200000,  pd: 3.5,  altman: 2.85, risk: "MEDIO",   operator: "L. Bianchi", lat: 41.9028, lng: 12.4964, indirizzo: "Via del Corso 120, Roma",
        documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 4 ? "uploaded" : "missing") as DocStatus, ...(i < 4 ? { uploadedAt: "2025-02-15", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_beta.pdf` } : {}) })) },
  3:  { id: 3,  name: "Gamma SRL",          piva: "IT00000000003", status: "DA REVISIONARE", sector: "Tech",           revenue: 22100000, pd: 1.8,  altman: 3.45, risk: "BASSO",   operator: "G. Verdi",   lat: 45.0703, lng: 7.6869, indirizzo: "Corso Vittorio Emanuele II 15, Torino",
        documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 3 ? "uploaded" : (i === 3 ? "error" : "missing")) as DocStatus, ...(i < 3 ? { uploadedAt: "2025-01-28", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_gamma.pdf` } : {}) })) },
  4:  { id: 4,  name: "Delta Corp.",        piva: "IT00000000004", status: "SOSPESA",        sector: "Edilizia",       revenue: 4500000,  pd: 5.2,  altman: 1.95, risk: "ALTO",    operator: "A. Neri",    lat: 40.8518, lng: 14.2681, indirizzo: "Via Toledo 44, Napoli",
        documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 2 ? "uploaded" : "missing") as DocStatus, ...(i < 2 ? { uploadedAt: "2025-02-10", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_delta.pdf` } : {}) })) },
  5:  { id: 5,  name: "Epsilon S.r.l.",     piva: "IT00000000005", status: "APPROVATA",      sector: "Alimentare",     revenue: 31000000, pd: 0.9,  altman: 4.10, risk: "BASSO",   operator: "M. Rossi",   lat: 44.4949, lng: 11.3426, indirizzo: "Via Rizzoli 8, Bologna",
        documents: REQUIRED_DOCS.map(d => ({ ...d, status: "uploaded" as DocStatus, uploadedAt: "2025-01-10", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_epsilon.pdf` })) },
  // Resto: documenti parziali o mancanti
  ...Object.fromEntries([6,7,8,9,10,11,12,13,14,15,16,17,18].map(id => {
    const names: Record<number, [string, string, Status, string]> = {
      6:  ["Zeta Industries",   "IT00000000006", "RIFIUTATA",      "Manifatturiero"],
      7:  ["Eta Holding",       "IT00000000007", "APPROVATA",      "Servizi"],
      8:  ["Theta Finance",     "IT00000000008", "IN ANALISI",     "Finanza"],
      9:  ["Iota Tech",         "IT00000000009", "DA REVISIONARE", "Tech"],
      10: ["Kappa Logistics",   "IT00000000010", "SOSPESA",        "Trasporti"],
      11: ["Lambda Group",      "IT00000000011", "APPROVATA",      "Alimentare"],
      12: ["Mu Pharma",         "IT00000000012", "IN ANALISI",     "Pharma"],
      13: ["Nu Energy",         "IT00000000013", "RIFIUTATA",      "Energia"],
      14: ["Xi Construction",   "IT00000000014", "DA REVISIONARE", "Edilizia"],
      15: ["Omicron Digital",   "IT00000000015", "APPROVATA",      "Tech"],
      16: ["Pi Consulting",     "IT00000000016", "IN ANALISI",     "Servizi"],
      17: ["Rho Automotive",    "IT00000000017", "SOSPESA",        "Automotive"],
      18: ["Sigma Textiles",    "IT00000000018", "DA REVISIONARE", "Manifatturiero"],
    };
    const [name, piva, status, sector] = names[id];
    const isComplete = ["APPROVATA"].includes(status);
    const docsUploaded = isComplete ? 6 : status === "IN ANALISI" ? 4 : status === "DA REVISIONARE" ? 3 : 1;
    return [id, {
      id, name, piva, status, sector, revenue: 10000000, pd: 3.0, altman: 2.5, risk: "MEDIO", operator: "M. Rossi",
      documents: REQUIRED_DOCS.map((d, i) => ({
        ...d,
        status: (i < docsUploaded ? "uploaded" : "missing") as DocStatus,
        ...(i < docsUploaded ? { uploadedAt: "2025-02-01", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}.pdf` } : {}),
      })),
    }] as [number, CompanyData];
  })),
};

// ─── Config ─────────────────────────────────────────────────────────────────
const DOC_STATUS_CONFIG: Record<DocStatus, { icon: string; text: string; bg: string; border: string }> = {
  uploaded: { icon: "✓", text: "text-green",  bg: "bg-green/10",  border: "border-green/30" },
  missing:  { icon: "○", text: "text-white/30", bg: "bg-white/5",  border: "border-white/10" },
  error:    { icon: "!", text: "text-red",    bg: "bg-red/10",    border: "border-red/30" },
};

// ─── Metis AI Panel ─────────────────────────────────────────────────────────
type AiMessage = { role: "user" | "assistant"; content: string };

function MetisAiPanel({ company, uploadedCount, totalDocs }: {
  company: CompanyData;
  uploadedCount: number;
  totalDocs: number;
}) {
  const contextMsg = `[CONTESTO PRATICA ATTIVA]\nAzienda: ${company.name} (PIVA: ${company.piva})\nSettore: ${company.sector} | Status: ${company.status}\nFatturato: €${(company.revenue / 1_000_000).toFixed(1)}M | PD: ${company.pd}% | Altman Z-Score: ${company.altman}\nRischio: ${company.risk} | Operatore: ${company.operator}\nDocumenti: ${uploadedCount}/${totalDocs} caricati\n\nSono in grado di analizzare questa pratica in dettaglio. Come posso aiutarti?`;

  const [msgs, setMsgs] = useState<AiMessage[]>([
    { role: "assistant", content: contextMsg },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: text };
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
      setMsgs([...next, { role: "assistant", content: "Errore di comunicazione con Metis. Riprova." }]);
    } finally {
      setLoading(false);
    }
  }, [msgs, loading]);

  return (
    <div className="glass-panel border border-cyan/20 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/metis-icon.png" alt="Metis AI" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] font-space font-bold text-cyan uppercase tracking-widest">Metis AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_6px_#00FF66] animate-pulse" />
        </div>
        <Link href="/copilot" className="text-[8px] font-space uppercase tracking-widest text-text-muted hover:text-cyan border border-white/10 hover:border-cyan/30 px-2 py-0.5 rounded transition">
          Apri completo →
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
        {msgs.map((m, i) => (
          <div key={i} className={`text-[11px] leading-relaxed px-3 py-2 rounded-lg ${
            m.role === "assistant"
              ? "bg-black/30 border border-white/5 text-white/80 border-l-2 border-l-cyan/40"
              : "bg-cyan/5 border border-cyan/20 text-white ml-4"
          }`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <span className="text-[9px] font-space text-cyan/50 uppercase tracking-widest">Metis sta elaborando...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi a Metis sulla pratica..."
          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-cyan/30 transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            input.trim() ? "bg-cyan/20 text-cyan border border-cyan/40 hover:bg-cyan/30" : "bg-white/5 text-white/20 border border-white/5"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function PraticaPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen bg-[var(--color-void)] items-center justify-center"><span className="text-white/30 text-sm">Caricamento...</span></div>}>
      <PraticaPage />
    </Suspense>
  );
}

function PraticaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = Number(searchParams.get("id") || "1");
  const company = MOCK_COMPANIES[companyId];

  const [docs, setDocs] = useState<RequiredDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (company) setDocs(company.documents);
  }, [company]);

  if (!company) {
    return (
      <main className="flex h-screen w-screen bg-[var(--color-void)] items-center justify-center">
        <div className="text-white/40 text-sm">Pratica non trovata</div>
      </main>
    );
  }

  const uploadedCount = docs.filter(d => d.status === "uploaded").length;
  const missingCount = docs.filter(d => d.status === "missing").length;
  const errorCount = docs.filter(d => d.status === "error").length;
  const allUploaded = missingCount === 0 && errorCount === 0;
  const isElaborata = company.status === "APPROVATA" || company.status === "RIFIUTATA";
  const sCfg = STATUS_CONFIG[company.status];

  const handleUpload = (idx: number) => {
    setDocs(prev => prev.map((d, i) => i === idx ? { ...d, status: "uploaded" as DocStatus, uploadedAt: new Date().toISOString().split("T")[0], fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}.pdf` } : d));
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 2000);
  };

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(0,229,255,0.06),_transparent_40%),radial-gradient(circle_at_70%_80%,_rgba(123,44,191,0.06),_transparent_40%)] pointer-events-none" />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/home")} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white transition shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
              <span className="text-xs font-space font-medium tracking-wide">Indietro</span>
            </button>
            <div>
              <h1 className="font-space text-lg text-white font-semibold">{company.name}</h1>
              <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
                <span className="text-text-muted">{company.piva}</span>
                <span className="text-white/30">&bull;</span>
                <span className="text-text-muted">{company.sector}</span>
                <span className="text-white/30">&bull;</span>
                <span className={`px-2 py-[1px] rounded ${sCfg.bg} ${sCfg.border} ${sCfg.text} text-[9px] uppercase font-bold border`}>
                  {sCfg.icon} {company.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted font-space">Operatore: <strong className="text-white">{company.operator}</strong></span>
            {isElaborata && (
              <Link href={`/dossier?id=${company.id}`}>
                <button className="flex items-center gap-2 bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/30 rounded-lg px-4 py-2 text-xs font-semibold font-space transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  Apri Dashboard Analisi
                </button>
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* KPI Summary */}
          <section className="grid grid-cols-5 gap-4 mb-6">
            {[
              { label: "PD", value: `${company.pd.toFixed(1)}%`, cls: company.pd > 5 ? "border-red/30 text-red bg-red/10" : company.pd > 3 ? "border-yellow/30 text-yellow bg-yellow/10" : "border-green/30 text-green bg-green/10" },
              { label: "Altman Z-Score", value: company.altman.toFixed(2), cls: company.altman < 1.8 ? "border-red/30 text-red bg-red/10" : company.altman < 3 ? "border-yellow/30 text-yellow bg-yellow/10" : "border-green/30 text-green bg-green/10" },
              { label: "Rischio", value: company.risk, cls: company.risk === "BASSO" ? "border-green/30 text-green bg-green/10" : company.risk === "CRITICO" ? "border-red/30 text-red bg-red/10" : "border-yellow/30 text-yellow bg-yellow/10" },
              { label: "Documenti", value: `${uploadedCount}/${docs.length}`, cls: allUploaded ? "border-green/30 text-green bg-green/10" : "border-yellow/30 text-yellow bg-yellow/10" },
              { label: "Fatturato", value: `€${(company.revenue / 1_000_000).toFixed(1)}M`, cls: "border-cyan/30 text-cyan bg-cyan/10" },
            ].map((kpi, i) => (
              <div key={i} className={`glass-panel flex flex-col items-center justify-center p-3 border ${kpi.cls}`}>
                <span className="text-[10px] uppercase tracking-wider text-text-muted">{kpi.label}</span>
                <span className="text-xl font-bold mt-1 font-space">{kpi.value}</span>
              </div>
            ))}
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Documents Panel — 2 cols */}
            <div className="col-span-2 glass-panel border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-space text-sm font-semibold text-white flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Documenti Richiesti
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-space">
                  <span className="text-green">{uploadedCount} caricati</span>
                  {missingCount > 0 && <span className="text-white/30">&bull;</span>}
                  {missingCount > 0 && <span className="text-yellow">{missingCount} mancanti</span>}
                  {errorCount > 0 && <span className="text-white/30">&bull;</span>}
                  {errorCount > 0 && <span className="text-red">{errorCount} errori</span>}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-gradient-to-r from-cyan to-green transition-all duration-500 rounded-full"
                  style={{ width: `${(uploadedCount / docs.length) * 100}%` }}
                />
              </div>

              {/* Document List */}
              <div className="space-y-2">
                {docs.map((doc, idx) => {
                  const dCfg = DOC_STATUS_CONFIG[doc.status];
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${dCfg.border} ${dCfg.bg} transition hover:border-white/20`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${dCfg.text} bg-black/30 border ${dCfg.border}`}>
                          {dCfg.icon}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{doc.name}</div>
                          <div className="text-text-muted text-[10px]">
                            {doc.status === "uploaded"
                              ? `${doc.fileName} — caricato il ${doc.uploadedAt}`
                              : doc.status === "error"
                              ? "Errore nel file caricato — ricaricare"
                              : doc.description}
                          </div>
                        </div>
                      </div>
                      <div>
                        {doc.status === "uploaded" ? (
                          <span className="text-[9px] font-space uppercase tracking-widest text-green bg-green/10 border border-green/30 px-2 py-1 rounded">Caricato</span>
                        ) : (
                          <button
                            onClick={() => handleUpload(idx)}
                            className={`text-[10px] font-space uppercase tracking-widest px-3 py-1.5 rounded-lg font-bold transition ${
                              doc.status === "error"
                                ? "bg-red/10 text-red border border-red/30 hover:bg-red/20"
                                : "bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20"
                            }`}
                          >
                            {doc.status === "error" ? "Ricarica" : "Carica"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit / Status */}
              <div className="mt-5 pt-4 border-t border-white/10">
                {submitted ? (
                  <div className="flex items-center gap-3 bg-green/10 border border-green/30 rounded-lg p-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                      <div className="text-green text-sm font-semibold">Pratica Sottomessa</div>
                      <div className="text-green/70 text-[10px]">In coda per analisi automatica. Tempo stimato: 3-5 minuti.</div>
                    </div>
                  </div>
                ) : isElaborata ? (
                  <div className="flex items-center gap-3 bg-green/10 border border-green/30 rounded-lg p-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                      <div className="text-green text-sm font-semibold">Analisi Completata</div>
                      <div className="text-green/70 text-[10px]">Tutti i moduli M1-M8 sono stati eseguiti. Clicca &quot;Apri Dashboard Analisi&quot; in alto per i risultati.</div>
                    </div>
                  </div>
                ) : allUploaded ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 rounded-lg font-space font-bold uppercase tracking-widest text-xs transition-all bg-gradient-to-r from-cyan to-[rgba(0,229,255,0.6)] text-black shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Sottomissione in corso...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Sottometti Pratica per Analisi
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-yellow/10 border border-yellow/30 rounded-lg p-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <div className="text-yellow text-sm font-semibold">Documenti Mancanti</div>
                      <div className="text-yellow/70 text-[10px]">
                        Carica i {missingCount} document{missingCount === 1 ? "o" : "i"} mancant{missingCount === 1 ? "e" : "i"}
                        {errorCount > 0 && ` e correggi ${errorCount} error${errorCount === 1 ? "e" : "i"}`} per poter sottomettere la pratica.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column — Info */}
            <div className="space-y-4">
              {/* Location Map Card */}
              {(company.lat && company.lng) && (
                <div className="glass-panel border border-white/10 overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps?q=${company.lat},${company.lng}&z=15&output=embed`}
                    className="w-full h-[130px] border-0 opacity-80"
                    loading="lazy"
                    allowFullScreen
                  />
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan shrink-0">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="text-[10px] text-text-muted font-space uppercase tracking-widest">Sede Legale</span>
                    </div>
                    <div className="text-[11px] text-white leading-relaxed">{company.indirizzo || "Indirizzo non disponibile"}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-text-muted font-mono">{company.piva}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] text-text-muted">{company.sector}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Info Card */}
              <div className="glass-panel border border-white/10 p-5">
                <h3 className="text-[10px] text-text-muted font-space uppercase tracking-widest mb-3">Anagrafica Azienda</h3>
                <div className="space-y-2">
                  {[
                    ["Ragione Sociale", company.name],
                    ["Partita IVA", company.piva],
                    ["Settore ATECO", company.sector],
                    ["Fatturato", `€${(company.revenue / 1_000_000).toFixed(1)}M`],
                    ["Operatore", company.operator],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                      <span className="text-text-muted text-[11px]">{label}</span>
                      <span className="text-white text-[11px] font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Status */}
              <div className="glass-panel border border-white/10 p-5">
                <h3 className="text-[10px] text-text-muted font-space uppercase tracking-widest mb-3">Stato Moduli Analisi</h3>
                <div className="space-y-1.5">
                  {[
                    { module: "M1", name: "Sintesi PEF", done: isElaborata },
                    { module: "M2", name: "Web Sentiment", done: isElaborata },
                    { module: "M3", name: "KPI Bilancio", done: isElaborata || company.status === "IN ANALISI" },
                    { module: "M4", name: "Benchmark ISTAT", done: isElaborata },
                    { module: "M5", name: "Analisi CR", done: isElaborata || company.status === "IN ANALISI" },
                    { module: "M6", name: "Cross-check", done: isElaborata },
                    { module: "M7", name: "Forecast DSCR", done: isElaborata },
                    { module: "M8", name: "SWOT", done: isElaborata },
                  ].map((m) => (
                    <div key={m.module} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${m.done ? "border-green/20 bg-green/5" : "border-white/5 bg-black/30"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-space font-bold ${m.done ? "text-green" : "text-white/30"}`}>{m.module}</span>
                        <span className={`text-[11px] ${m.done ? "text-white" : "text-white/30"}`}>{m.name}</span>
                      </div>
                      <span className={`text-[9px] font-space uppercase tracking-widest ${m.done ? "text-green" : "text-white/20"}`}>
                        {m.done ? "✓ Completato" : "— In attesa"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metis AI Panel */}
              <MetisAiPanel company={company} uploadedCount={uploadedCount} totalDocs={docs.length} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
