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
  1: {
    id: 1, name: "Alpha S.p.A.", piva: "IT00000000001", status: "APPROVATA", sector: "Manifatturiero", revenue: 15400000, pd: 2.1, altman: 3.12, risk: "BASSO", operator: "M. Rossi", lat: 45.4718, lng: 9.1895, indirizzo: "Via Montenapoleone 3, Milano",
    documents: REQUIRED_DOCS.map(d => ({ ...d, status: "uploaded" as DocStatus, uploadedAt: "2025-01-20", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_alpha.pdf` }))
  },
  2: {
    id: 2, name: "Beta Ltd.", piva: "IT00000000002", status: "IN ANALISI", sector: "Servizi", revenue: 8200000, pd: 3.5, altman: 2.85, risk: "MEDIO", operator: "L. Bianchi", lat: 41.9028, lng: 12.4964, indirizzo: "Via del Corso 120, Roma",
    documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 4 ? "uploaded" : "missing") as DocStatus, ...(i < 4 ? { uploadedAt: "2025-02-15", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_beta.pdf` } : {}) }))
  },
  3: {
    id: 3, name: "Gamma SRL", piva: "IT00000000003", status: "DA REVISIONARE", sector: "Tech", revenue: 22100000, pd: 1.8, altman: 3.45, risk: "BASSO", operator: "G. Verdi", lat: 45.0703, lng: 7.6869, indirizzo: "Corso Vittorio Emanuele II 15, Torino",
    documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 3 ? "uploaded" : (i === 3 ? "error" : "missing")) as DocStatus, ...(i < 3 ? { uploadedAt: "2025-01-28", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_gamma.pdf` } : {}) }))
  },
  4: {
    id: 4, name: "Delta Corp.", piva: "IT00000000004", status: "SOSPESA", sector: "Edilizia", revenue: 4500000, pd: 5.2, altman: 1.95, risk: "ALTO", operator: "A. Neri", lat: 40.8518, lng: 14.2681, indirizzo: "Via Toledo 44, Napoli",
    documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 2 ? "uploaded" : "missing") as DocStatus, ...(i < 2 ? { uploadedAt: "2025-02-10", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_delta.pdf` } : {}) }))
  },
  5: {
    id: 5, name: "Epsilon S.r.l.", piva: "IT00000000005", status: "APPROVATA", sector: "Alimentare", revenue: 31000000, pd: 0.9, altman: 4.10, risk: "BASSO", operator: "M. Rossi", lat: 44.4949, lng: 11.3426, indirizzo: "Via Rizzoli 8, Bologna",
    documents: REQUIRED_DOCS.map(d => ({ ...d, status: "uploaded" as DocStatus, uploadedAt: "2025-01-10", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_epsilon.pdf` }))
  },
  // Resto: documenti parziali o mancanti
  ...Object.fromEntries([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(id => {
    const names: Record<number, [string, string, Status, string]> = {
      6: ["Zeta Industries", "IT00000000006", "RIFIUTATA", "Manifatturiero"],
      7: ["Eta Holding", "IT00000000007", "APPROVATA", "Servizi"],
      8: ["Theta Finance", "IT00000000008", "IN ANALISI", "Finanza"],
      9: ["Iota Tech", "IT00000000009", "DA REVISIONARE", "Tech"],
      10: ["Kappa Logistics", "IT00000000010", "SOSPESA", "Trasporti"],
      11: ["Lambda Group", "IT00000000011", "APPROVATA", "Alimentare"],
      12: ["Mu Pharma", "IT00000000012", "IN ANALISI", "Pharma"],
      13: ["Nu Energy", "IT00000000013", "RIFIUTATA", "Energia"],
      14: ["Xi Construction", "IT00000000014", "DA REVISIONARE", "Edilizia"],
      15: ["Omicron Digital", "IT00000000015", "APPROVATA", "Tech"],
      16: ["Pi Consulting", "IT00000000016", "IN ANALISI", "Servizi"],
      17: ["Rho Automotive", "IT00000000017", "SOSPESA", "Automotive"],
      18: ["Sigma Textiles", "IT00000000018", "DA REVISIONARE", "Manifatturiero"],
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
  100: {
    id: 100, name: "PECORELLA SPA", piva: "IT09876543210", status: "IN ANALISI", sector: "Tech", revenue: 4850000, pd: 2.1, altman: 3.52, risk: "BASSO", operator: "METIS AI",
    lat: 37.3011, lng: 14.2106, indirizzo: "Via Vittorio Emanuele, 12 — 93013 Mazzarino (CL)",
    documents: REQUIRED_DOCS.map((d, i) => ({ ...d, status: (i < 4 ? "uploaded" : "missing") as DocStatus, ...(i < 4 ? { uploadedAt: "2026-03-27", fileName: `${d.name.toLowerCase().replace(/\s/g, "_")}_pecorella.pdf` } : {}) }))
  },
};

// ─── Config ─────────────────────────────────────────────────────────────────
const DOC_STATUS_CONFIG: Record<DocStatus, { icon: string; text: string; bg: string; border: string }> = {
  uploaded: { icon: "✓", text: "text-green", bg: "bg-green/10", border: "border-green/30" },
  missing: { icon: "○", text: "text-white/30", bg: "bg-white/5", border: "border-white/10" },
  error: { icon: "!", text: "text-red", bg: "bg-red/10", border: "border-red/30" },
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
    <div className="glass-panel border border-cyan/20 p-5 rounded-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.4)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/metis-icon.png" alt="" aria-hidden="true" className="w-full h-full object-cover" />
          </div>
          <span className="text-[11px] font-space font-bold text-cyan uppercase tracking-[0.2em]">Metis AI</span>
          <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_#00FF66] animate-pulse" aria-label="Online" />
        </div>
        <Link href="/copilot" className="text-[9px] font-space uppercase tracking-[0.2em] font-bold text-text-muted hover:text-cyan border border-white/10 hover:border-cyan/30 px-3 py-1.5 rounded-lg transition-colors">
          Apri a schermo intero
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[250px] space-y-3 pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,229,255,0.2)_transparent]" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`text-[12px] leading-relaxed px-4 py-3 rounded-xl ${m.role === "assistant"
              ? "bg-black/40 border border-white/5 text-white/90 border-l-2 border-l-cyan/50"
              : "bg-cyan/10 border border-cyan/30 text-white ml-6 shadow-inner"
            }`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <span className="text-[10px] font-space text-cyan/70 uppercase tracking-[0.1em] font-bold">Metis sta analizzando...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-3 mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi a Metis su questa pratica…"
          aria-label="Messaggio per Metis AI"
          autoComplete="off"
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[#090D14] transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Invia messaggio"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[#090D14] ${input.trim() ? "bg-cyan/20 text-cyan border border-cyan/40 hover:bg-cyan/30 hover:scale-[1.05] hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]" : "bg-white/5 text-white/20 border border-white/5"
            }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </form>
    </div>
  );
}

// ─── Delibera Panel ──────────────────────────────────────────────────────────
type DelibraStep = "idle" | "approve" | "reject" | "escalation" | "done_approve" | "done_reject" | "done_escalation";

function DelibraPanel({ company }: { company: CompanyData; isElaborata: boolean }) {
  const [step, setStep] = useState<DelibraStep>("idle");
  const [note, setNote] = useState("");

  const status = company.status;

  // Pratiche già concluse → mostra badge finale
  if (status === "APPROVATA") {
    return (
      <div className="glass-panel border border-green/30 p-6 rounded-xl">
        <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-3">Proposta di Delibera</h3>
        <div className="flex items-center gap-3 bg-green/10 border border-green/30 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center text-green shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <div className="text-green text-sm font-bold font-space uppercase tracking-widest">Pratica Approvata</div>
            <div className="text-green/60 text-[11px]">La delibera è già stata emessa con esito favorevole.</div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "RIFIUTATA") {
    return (
      <div className="glass-panel border border-red/30 p-6 rounded-xl">
        <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-3">Proposta di Delibera</h3>
        <div className="flex items-center gap-3 bg-red/10 border border-red/30 rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-red/20 flex items-center justify-center text-red shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div>
            <div className="text-red text-sm font-bold font-space uppercase tracking-widest">Pratica Rifiutata</div>
            <div className="text-red/60 text-[11px]">La delibera è già stata emessa con esito negativo.</div>
          </div>
        </div>
      </div>
    );
  }

  // Documenti mancanti o stato iniziale (non ancora in analisi)
  if (status !== "IN ANALISI" && status !== "DA REVISIONARE" && status !== "SOSPESA") {
    return (
      <div className="glass-panel border border-white/10 p-6 rounded-xl opacity-50">
        <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-3">Proposta di Delibera</h3>
        <p className="text-[11px] text-white/40">Avvia l&apos;analisi XAI per sbloccare le azioni di delibera.</p>
      </div>
    );
  }

  // Pulsanti da mostrare per stato
  const showApproveReject = status === "IN ANALISI" || status === "DA REVISIONARE";
  const showEscalation = true; // sempre disponibile per stati attivi

  return (
    <>
      <div className="glass-panel border border-white/10 p-6 rounded-xl">
        <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-1">Proposta di Delibera</h3>
        <p className="text-[11px] text-white/50 mb-5">
          {status === "SOSPESA" ? "Pratica sospesa. Puoi richiedere integrazioni o ulteriori informazioni." : "Seleziona l\u2019esito finale per questa pratica di fido."}
        </p>

        <div className="space-y-3">
          {/* Approva */}
          {showApproveReject && (
            <button
              onClick={() => setStep("approve")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-green/30 bg-green/5 hover:bg-green/10 hover:border-green/50 hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/30 flex items-center justify-center text-green shrink-0 group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="text-left">
                <div className="text-green text-sm font-bold font-space uppercase tracking-widest">Approva</div>
                <div className="text-green/60 text-[11px]">Proposta delibera favorevole al CRO</div>
              </div>
            </button>
          )}

          {/* Escalation / Richiedi Integrazione */}
          {showEscalation && (
            <button
              onClick={() => setStep("escalation")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-yellow/30 bg-yellow/5 hover:bg-yellow/10 hover:border-yellow/50 hover:shadow-[0_0_20px_rgba(250,204,21,0.15)] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow/10 border border-yellow/30 flex items-center justify-center text-yellow shrink-0 group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div className="text-left">
                <div className="text-yellow text-sm font-bold font-space uppercase tracking-widest">Richiedi Integrazione</div>
                <div className="text-yellow/60 text-[11px]">Scala al livello superiore o richiedi doc aggiuntivi</div>
              </div>
            </button>
          )}

          {/* Rifiuta */}
          {showApproveReject && (
            <button
              onClick={() => setStep("reject")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-red/30 bg-red/5 hover:bg-red/10 hover:border-red/50 hover:shadow-[0_0_20px_rgba(255,71,87,0.15)] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-red/10 border border-red/30 flex items-center justify-center text-red shrink-0 group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <div className="text-left">
                <div className="text-red text-sm font-bold font-space uppercase tracking-widest">Rifiuta</div>
                <div className="text-red/60 text-[11px]">Proposta delibera negativa con motivazione</div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ─── Modali Conferma ─────────────────────────────────── */}
      {(step === "approve" || step === "reject" || step === "escalation") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="w-[480px] glass-panel border rounded-2xl p-8 relative overflow-hidden shadow-2xl"
            style={{ borderColor: step === "approve" ? "rgba(0,255,102,0.4)" : step === "escalation" ? "rgba(250,204,21,0.4)" : "rgba(255,71,87,0.4)" }}>

            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: step === "approve" ? "#00FF66" : step === "escalation" ? "#FACC15" : "#FF4757" }} />

            <div className="text-center mb-6 relative z-10">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 border"
                style={{
                  background: step === "approve" ? "rgba(0,255,102,0.1)" : step === "escalation" ? "rgba(250,204,21,0.1)" : "rgba(255,71,87,0.1)",
                  borderColor: step === "approve" ? "rgba(0,255,102,0.4)" : step === "escalation" ? "rgba(250,204,21,0.4)" : "rgba(255,71,87,0.4)"
                }}>
                {step === "approve" && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                {step === "escalation" && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-yellow)" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                {step === "reject" && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
              </div>
              <h2 className="text-white font-space text-lg font-bold mb-1">
                {step === "approve" ? "Conferma Approvazione" : step === "escalation" ? "Richiesta di Integrazione" : "Conferma Rifiuto"}
              </h2>
              <p className="text-white/50 text-[11px]">{company.name} — {company.piva}</p>
            </div>

            <div className="mb-6 relative z-10">
              <label className="block text-[10px] font-space uppercase tracking-[0.2em] text-text-muted mb-2">
                {step === "escalation" ? "Motivo escalation / documenti richiesti" : "Note per il CRO (facoltativo)"}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder={step === "approve" ? "Es: DSCR solido, garanzie adeguate…" : step === "escalation" ? "Es: Mancano 2 anni di bilancio, richiedere integrazione…" : "Es: PD superiore alla soglia, scoring negativo…"}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-white/30 focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 outline-none resize-none transition-all"
              />
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => { setStep("idle"); setNote(""); }}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-space font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setStep(step === "approve" ? "done_approve" : step === "escalation" ? "done_escalation" : "done_reject");
                  setNote("");
                }}
                className="flex-1 py-3 rounded-xl text-xs font-space font-bold uppercase tracking-widest transition-all"
                style={{
                  background: step === "approve" ? "linear-gradient(to right, #00FF66, #00CC52)" : step === "escalation" ? "linear-gradient(to right, #FACC15, #EAB308)" : "linear-gradient(to right, #FF4757, #CC2936)",
                  color: "black",
                  boxShadow: step === "approve" ? "0 0 20px rgba(0,255,102,0.4)" : step === "escalation" ? "0 0 20px rgba(250,204,21,0.4)" : "0 0 20px rgba(255,71,87,0.4)"
                }}
              >
                {step === "approve" ? "Invia al CRO →" : step === "escalation" ? "Richiedi Integrazione →" : "Conferma Rifiuto →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast Esito ─────────────────────────────────── */}
      {(step === "done_approve" || step === "done_reject" || step === "done_escalation") && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-2xl glass-panel animate-in slide-in-from-bottom duration-500"
          style={{ borderColor: step === "done_approve" ? "rgba(0,255,102,0.4)" : step === "done_escalation" ? "rgba(250,204,21,0.4)" : "rgba(255,71,87,0.4)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
            style={{ background: step === "done_approve" ? "rgba(0,255,102,0.1)" : step === "done_escalation" ? "rgba(250,204,21,0.1)" : "rgba(255,71,87,0.1)", borderColor: step === "done_approve" ? "rgba(0,255,102,0.4)" : step === "done_escalation" ? "rgba(250,204,21,0.4)" : "rgba(255,71,87,0.4)" }}>
            {step === "done_approve" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
            {step === "done_escalation" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-yellow)" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
            {step === "done_reject" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
          </div>
          <div>
            <div className="text-white text-sm font-bold font-space uppercase tracking-widest">
              {step === "done_approve" ? "Pratica approvata ✓" : step === "done_escalation" ? "Escalation inviata ✓" : "Pratica rifiutata ✓"}
            </div>
            <div className="text-white/50 text-[11px]">
              {step === "done_approve" ? "Proposta inviata al CRO per signature" : step === "done_escalation" ? "Richiesta inviata al livello superiore" : "Notifica inviata con motivazione"}
            </div>
          </div>
          <button onClick={() => setStep("idle")} className="ml-4 text-white/30 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </>
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
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; filename?: string } | null>(null);

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><polyline points="15 18 9 12 15 6" /></svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                  Apri Dashboard Analisi
                </button>
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* KPI Summary */}
          <section className="grid grid-cols-5 gap-6 mb-6">
            {[
              { label: "PD", value: `${company.pd.toFixed(1)}%`, cls: company.pd > 5 ? "border-red/30 text-red bg-red/10" : company.pd > 3 ? "border-yellow/30 text-yellow bg-yellow/10" : "border-green/30 text-green bg-green/10" },
              { label: "Altman Z-Score", value: company.altman.toFixed(2), cls: company.altman < 1.8 ? "border-red/30 text-red bg-red/10" : company.altman < 3 ? "border-yellow/30 text-yellow bg-yellow/10" : "border-green/30 text-green bg-green/10" },
              { label: "Rischio", value: company.risk, cls: company.risk === "BASSO" ? "border-green/30 text-green bg-green/10" : company.risk === "CRITICO" ? "border-red/30 text-red bg-red/10" : "border-yellow/30 text-yellow bg-yellow/10" },
              { label: "Documenti", value: `${uploadedCount}/${docs.length}`, cls: allUploaded ? "border-green/30 text-green bg-green/10" : "border-yellow/30 text-yellow bg-yellow/10" },
              { label: "Fatturato", value: `€${(company.revenue / 1_000_000).toFixed(1)}M`, cls: "border-cyan/30 text-cyan bg-cyan/10" },
            ].map((kpi, i) => (
              <div key={i} className={`glass-panel flex flex-col items-center justify-center p-5 border ${kpi.cls} transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.02] cursor-default`}>
                <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-space">{kpi.label}</span>
                <span className={`text-2xl font-bold mt-2 font-mono [font-variant-numeric:tabular-nums] ${kpi.label === 'Fatturato' ? 'text-white' : ''}`}>{kpi.value}</span>
              </div>
            ))}
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column — 2 cols */}
            <div className="col-span-2 space-y-6 flex flex-col">
              {/* Metis AI Panel */}
              <MetisAiPanel company={company} uploadedCount={uploadedCount} totalDocs={docs.length} />

              {/* Documents Panel */}
              <div className="glass-panel border border-white/10 p-6 flex flex-col gap-5">
                <header className="flex items-center justify-between">
                  <h2 className="font-space text-lg font-semibold text-white flex items-center gap-2 [text-wrap:balance]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Documenti Richiesti
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] font-space tracking-widest uppercase">
                    <span className="text-green font-bold">{uploadedCount} caricati</span>
                    {missingCount > 0 && <span className="text-white/20">|</span>}
                    {missingCount > 0 && <span className="text-yellow font-bold">{missingCount} mancanti</span>}
                    {errorCount > 0 && <span className="text-white/20">|</span>}
                    {errorCount > 0 && <span className="text-red font-bold">{errorCount} errori</span>}
                  </div>
                </header>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan to-green transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_var(--color-cyan)]"
                    style={{ width: `${(uploadedCount / docs.length) * 100}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round((uploadedCount / docs.length) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                {/* Document List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                  {docs.map((doc, idx) => {
                    const dCfg = DOC_STATUS_CONFIG[doc.status];
                    return (
                      <div
                        key={idx}
                        onClick={() => doc.status === "uploaded" && setSelectedDoc({ title: doc.name, filename: doc.fileName })}
                        className={`group flex items-center justify-between p-4 min-h-[4rem] rounded-xl border ${dCfg.border} ${dCfg.bg} transition-all duration-300 hover:border-white/30 ${doc.status === "uploaded" ? "cursor-pointer hover:bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${dCfg.text} bg-black/40 border ${dCfg.border} shadow-inner`}>
                            {typeof dCfg.icon === 'string' ? dCfg.icon : dCfg.icon}
                          </div>
                          <div className="flex flex-col justify-center">
                            <div className="text-white text-sm font-semibold tracking-wide group-hover:text-cyan transition-colors">{doc.name}</div>
                            <div className="text-text-muted text-[11px] mt-0.5">
                              {doc.status === "uploaded"
                                ? <span className="text-white/60 font-mono group-hover:text-white transition-colors">{doc.fileName} — <span className="text-text-muted">{doc.uploadedAt}</span></span>
                                : doc.status === "error"
                                  ? <span className="text-red/80">Errore nel file caricato — necessario caricare un nuovo documento</span>
                                  : doc.description}
                            </div>
                          </div>
                        </div>
                        <div>
                          {doc.status === "uploaded" ? (
                            <span className="text-[10px] font-space uppercase tracking-[0.2em] font-bold text-green bg-green/10 border border-green/30 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.1)] group-hover:bg-green/20 transition-colors">Apri ✓</span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpload(idx); }}
                              className={`text-[10px] font-space uppercase tracking-[0.2em] font-bold px-4 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${doc.status === "error"
                                  ? "bg-red/10 text-red border border-red/40 hover:bg-red/20 hover:shadow-[0_0_15px_rgba(255,71,87,0.3)] focus-visible:ring-red"
                                  : "bg-cyan/10 text-cyan border border-cyan/40 hover:bg-cyan/20 hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:scale-[1.02] focus-visible:ring-cyan"
                                }`}
                              aria-label={`Carica documento ${doc.name}`}
                            >
                              {doc.status === "error" ? "Ricarica" : "Carica File"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit / Status */}
                <div className="mt-2 pt-5 border-t border-white/10" aria-live="polite">
                  {submitted ? (
                    <div className="flex items-center gap-4 bg-green/10 border border-green/30 rounded-xl p-5 shadow-[0_0_20px_rgba(0,255,102,0.1)]">
                      <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center text-green shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <div className="text-green text-sm font-bold font-space uppercase tracking-widest mb-1">Pratica Sottomessa</div>
                        <div className="text-green/80 text-[11px] leading-relaxed">In coda per analisi automatica. Il motore XAI è in esecuzione, tempo stimato: 3-5 minuti...</div>
                      </div>
                    </div>
                  ) : isElaborata ? (
                    <div className="flex items-center gap-4 bg-cyan/10 border border-cyan/30 rounded-xl p-5 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                      <div className="w-10 h-10 rounded-full bg-cyan/20 flex items-center justify-center text-cyan shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      </div>
                      <div>
                        <div className="text-cyan text-sm font-bold font-space uppercase tracking-widest mb-1">Analisi Completata</div>
                        <div className="text-cyan/80 text-[11px] leading-relaxed">Tutti i moduli M1-M8 sono stati eseguiti con successo. Procedi alla Dashboard Analisi per i risultati XAI.</div>
                      </div>
                    </div>
                  ) : allUploaded ? (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full h-12 rounded-xl font-space font-bold uppercase tracking-[0.2em] text-xs transition-all bg-cyan text-black shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-70 disabled:hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:hover:bg-cyan flex items-center justify-center gap-3"
                    >
                      {submitting ? (
                        <>
                          <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Sottomissione Motore XAI...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Avvia Analisi Pratica
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 bg-yellow/10 border border-yellow/30 rounded-xl p-5">
                      <div className="w-10 h-10 rounded-full bg-yellow/20 flex items-center justify-center text-yellow shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      </div>
                      <div>
                        <div className="text-yellow text-sm font-bold font-space uppercase tracking-widest mb-1">Azione Richiesta</div>
                        <div className="text-yellow/80 text-[11px] leading-relaxed">
                          Sistema in attesa di <strong className="text-yellow">{missingCount}</strong> document{missingCount === 1 ? "o" : "i"}
                          {errorCount > 0 && ` e correzione di ${errorCount} error${errorCount === 1 ? "e" : "i"}`} per sbloccare l'analisi automatica.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bilanci Storici Panel */}
              <div className="glass-panel border border-white/10 p-6 flex flex-col gap-4 rounded-xl">
                <header className="flex items-center justify-between">
                  <h2 className="font-space text-lg font-semibold text-white flex items-center gap-2 [text-wrap:balance]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="8" y1="18" x2="8" y2="15" /><line x1="16" y1="18" x2="16" y2="9" /></svg>
                    Archivio Bilanci Storici
                  </h2>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 text-text-muted font-space uppercase tracking-[0.1em]">
                        <th className="pb-3 px-3 font-medium">Esercizio</th>
                        <th className="pb-3 px-3 font-medium">Stato Patrimoniale</th>
                        <th className="pb-3 px-3 font-medium">Conto Economico</th>
                        <th className="pb-3 px-3 font-medium text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {["2023", "2022", "2021"].map((yr) => (
                        <tr key={yr} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 text-white font-mono">{yr}</td>
                          <td className="py-3 px-3 text-white/70">Depositato (XBRL)</td>
                          <td className="py-3 px-3 text-white/70">Depositato (XBRL)</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedDoc({ title: `Fascicolo di Bilancio ${yr}`, filename: `bilancio_xbrl_${yr}.pdf` })}
                              className="text-[10px] font-space uppercase text-cyan hover:text-white border border-cyan/30 hover:border-cyan/60 hover:bg-cyan/10 px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
                            >
                              Visualizza
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Right Column — Info */}
            <div className="space-y-6">
              {/* Location Map Card */}
              {(company.lat && company.lng) && (
                <div className="glass-panel border border-white/10 overflow-hidden rounded-xl">
                  <iframe
                    src={`https://www.google.com/maps?q=${company.lat},${company.lng}&z=15&output=embed`}
                    className="w-full h-[150px] border-0 opacity-80 filter grayscale invert contrast-125 transition-all duration-700 hover:filter-none hover:opacity-100"
                    loading="lazy"
                    title="Mappa Sede Aziendale"
                  />
                  <div className="p-4 bg-black/40">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan shrink-0">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="text-[10px] text-cyan font-space uppercase tracking-[0.2em] font-bold">Sede Legale</span>
                    </div>
                    <div className="text-[12px] text-white leading-relaxed font-medium">{company.indirizzo || "Indirizzo non disponibile"}</div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                      <span className="text-[10px] text-text-muted font-mono tracking-widest">{company.piva}</span>
                      <span className="text-white/20">|</span>
                      <span className="text-[10px] text-white/80">{company.sector}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Info Card */}
              <div className="glass-panel border border-white/10 p-6 rounded-xl">
                <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-4">Anagrafica Azienda</h3>
                <div className="space-y-2">
                  {[
                    ["Ragione Sociale", company.name],
                    ["Partita IVA", company.piva],
                    ["Settore ATECO", company.sector],
                    ["Fatturato", `€${(company.revenue / 1_000_000).toFixed(1)}M`],
                    ["Operatore", company.operator],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center bg-black/40 rounded-lg px-4 py-3 border border-white/5 transition-colors hover:bg-white/[0.03]">
                      <span className="text-text-muted text-[11px] font-medium">{label}</span>
                      <span className="text-white text-[12px] font-mono [font-variant-numeric:tabular-nums] font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Status */}
              <div className="glass-panel border border-white/10 p-6 rounded-xl">
                <h3 className="text-[10px] text-text-muted font-space uppercase tracking-[0.2em] font-bold mb-4">Stato Moduli Analisi XAI</h3>
                <div className="space-y-2">
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
                    <div key={m.module} className={`flex items-center justify-between rounded-lg px-4 py-2.5 border transition-all ${m.done ? "border-green/20 bg-green/5 hover:border-green/40" : "border-white/5 bg-black/40 hover:bg-white/[0.02]"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-space font-bold ${m.done ? "text-green" : "text-white/30"}`}>{m.module}</span>
                        <span className={`text-[11px] font-medium ${m.done ? "text-white" : "text-white/40"}`}>{m.name}</span>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[9px] font-space uppercase tracking-[0.1em] font-bold ${m.done ? "text-green" : "text-white/20"}`}>
                        {m.done ? (
                          <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> Fatto</>
                        ) : "In attesa"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Proposta di Delibera ─────────────────────────── */}
              <DelibraPanel company={company} isElaborata={isElaborata} />

            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 outline-none"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedDoc(null); }}
          onClick={() => setSelectedDoc(null)}
        >
          {/* Modal Container */}
          <div
            className="w-full max-w-5xl h-[85vh] bg-[#0A0E17] border border-cyan/30 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.1)] animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="h-14 bg-black/60 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center text-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div>
                  <h3 className="text-white text-sm font-space font-bold tracking-wide">{selectedDoc.title}</h3>
                  {selectedDoc.filename && <span className="text-[10px] text-white/50 font-mono">{selectedDoc.filename}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Fake action buttons */}
                <button className="text-white/50 hover:text-white p-2 transition-colors rounded hover:bg-white/10" aria-label="Scarica PDF" title="Scarica Documento">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
                <button className="text-white/50 hover:text-white p-2 transition-colors rounded hover:bg-white/10" aria-label="Stampa" title="Stampa Documento">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red/10 text-red border border-red/30 hover:bg-red/20 transition-all shadow-[0_0_10px_rgba(255,71,87,0.1)]"
                  aria-label="Chiudi visualizzatore"
                  title="Chiudi"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>

            {/* Viewer Content (Fake A4 Page) */}
            <div className="flex-1 bg-[#1A1D24] overflow-y-auto p-8 flex justify-center [scrollbar-width:thin] [scrollbar-color:rgba(0,229,255,0.2)_transparent] cursor-zoom-in">
              <div className="w-full max-w-3xl bg-white min-h-[1000px] shadow-2xl rounded p-12 text-[#333] cursor-text">
                {/* Fake PDF Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900">{company.name}</h1>
                    <p className="text-sm font-mono text-gray-500 mt-1">P.IVA: {company.piva} - Sede: {company.indirizzo}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-cyan-700 bg-cyan-50 px-3 py-1 border border-cyan-200 rounded">
                      DOCUMENTO UFFICIALE
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-mono">ID Prot: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                  </div>
                </div>

                {/* Fake Document Content (Skeleton lines representing text & tables) */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold border-b border-gray-100 pb-2 mb-4">{selectedDoc.title}</h2>
                    <p className="text-sm leading-relaxed text-gray-600 mb-6">
                      Il presente documento contiene l'evidenza ufficiale per la pratica in oggetto. I dati sottostanti sono estratti in via automatizzata tramite lettore ottico OCR o da flusso XBRL validato.
                    </p>
                  </div>

                  {/* Fake Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-left">
                        <tr>
                          <th className="p-3">Voce / Descrizione</th>
                          <th className="p-3">Periodo Attuale</th>
                          <th className="p-3">Variazione %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-600">
                        <tr><td className="p-3 font-medium">A) Valore della produzione</td><td className="p-3 font-mono">€ 15.420.000</td><td className="p-3 text-green-600">+4.2%</td></tr>
                        <tr><td className="p-3 font-medium">B) Costi della produzione</td><td className="p-3 font-mono">€ 12.100.000</td><td className="p-3 text-red-600">+1.1%</td></tr>
                        <tr><td className="p-3 font-medium">C) Proventi e oneri finanziari</td><td className="p-3 font-mono">€ 320.000</td><td className="p-3 text-gray-400">0.0%</td></tr>
                        <tr className="bg-gray-50 font-bold text-gray-800"><td className="p-3">Risultato prima delle imposte</td><td className="p-3 font-mono">€ 3.000.000</td><td className="p-3 text-green-600">+8.5%</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Skeleton Text Blocks */}
                  <div className="space-y-3 pt-6">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4 mt-4"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                  </div>
                </div>

                {/* Fake Footer */}
                <div className="mt-20 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 font-mono">
                  Pagina 1 di 12 — Generato dal sistema Metis AI engine il {new Date().toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
