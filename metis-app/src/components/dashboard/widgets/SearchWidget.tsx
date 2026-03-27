"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";

// ──────────────────────────────────────────────────────────────────────────────
// Simplified mirror of the pratiche mock used in home/page.tsx + pratica/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
const PRATICHE = [
  { id: 1, name: "Alpha S.p.A.", piva: "IT00000000001", status: "APPROVATA", sector: "Manifatturiero", risk: "BASSO" },
  { id: 2, name: "Beta Ltd.", piva: "IT00000000002", status: "IN ANALISI", sector: "Servizi", risk: "MEDIO" },
  { id: 3, name: "Gamma SRL", piva: "IT00000000003", status: "DA REVISIONARE", sector: "Tech", risk: "BASSO" },
  { id: 4, name: "Delta Corp.", piva: "IT00000000004", status: "SOSPESA", sector: "Edilizia", risk: "ALTO" },
  { id: 5, name: "Epsilon S.r.l.", piva: "IT00000000005", status: "APPROVATA", sector: "Alimentare", risk: "BASSO" },
  { id: 6, name: "Zeta Industries", piva: "IT00000000006", status: "RIFIUTATA", sector: "Manifatturiero", risk: "CRITICO" },
  { id: 7, name: "Eta Holding", piva: "IT00000000007", status: "APPROVATA", sector: "Servizi", risk: "BASSO" },
  { id: 8, name: "Theta Finance", piva: "IT00000000008", status: "IN ANALISI", sector: "Finanza", risk: "MEDIO" },
  { id: 9, name: "Iota Tech", piva: "IT00000000009", status: "DA REVISIONARE", sector: "Tech", risk: "MEDIO" },
  { id: 10, name: "Kappa Logistics", piva: "IT00000000010", status: "SOSPESA", sector: "Trasporti", risk: "ALTO" },
  { id: 11, name: "Lambda Group", piva: "IT00000000011", status: "APPROVATA", sector: "Alimentare", risk: "BASSO" },
  { id: 12, name: "Mu Pharma", piva: "IT00000000012", status: "IN ANALISI", sector: "Pharma", risk: "MEDIO" },
  { id: 13, name: "Nu Energy", piva: "IT00000000013", status: "RIFIUTATA", sector: "Energia", risk: "CRITICO" },
  { id: 14, name: "Xi Construction", piva: "IT00000000014", status: "DA REVISIONARE", sector: "Edilizia", risk: "ALTO" },
  { id: 15, name: "Omicron Digital", piva: "IT00000000015", status: "APPROVATA", sector: "Tech", risk: "BASSO" },
  { id: 16, name: "Pi Consulting", piva: "IT00000000016", status: "IN ANALISI", sector: "Servizi", risk: "BASSO" },
  { id: 17, name: "Rho Automotive", piva: "IT00000000017", status: "SOSPESA", sector: "Automotive", risk: "ALTO" },
  { id: 18, name: "Sigma Textiles", piva: "IT00000000018", status: "DA REVISIONARE", sector: "Manifatturiero", risk: "MEDIO" },
  { id: 100, name: "PECORELLA SPA", piva: "IT09876543210", status: "IN ANALISI", sector: "Tech", risk: "BASSO" },
];

const STATUS_COLORS: Record<string, string> = {
  "APPROVATA": "text-green border-green/30 bg-green/10",
  "IN ANALISI": "text-cyan border-cyan/30 bg-cyan/10",
  "DA REVISIONARE": "text-yellow border-yellow/30 bg-yellow/10",
  "SOSPESA": "text-purple border-purple/30 bg-purple/10",
  "RIFIUTATA": "text-red border-red/30 bg-red/10",
};

const RISK_COLORS: Record<string, string> = {
  "BASSO": "text-green",
  "MEDIO": "text-yellow",
  "ALTO": "text-red",
  "CRITICO": "text-red",
};

export function SearchWidget() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PRATICHE.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.piva.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 h-full relative">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Cerca azienda, PIVA, settore, stato..."
          className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-[13px] text-white placeholder:text-white/25 outline-none focus:border-cyan/40 transition"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">
          {results.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/15 group transition">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-text-muted mt-0.5 font-space">{p.piva} · {p.sector}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-space font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${STATUS_COLORS[p.status]}`}>
                  {p.status}
                </span>
                <span className={`text-[9px] font-bold uppercase ${RISK_COLORS[p.risk]}`}>{p.risk}</span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <Link href={`/pratica?id=${p.id}`}>
                    <button className="text-[9px] font-space uppercase text-white/50 hover:text-cyan border border-white/10 hover:border-cyan/30 px-2 py-0.5 rounded transition">
                      Pratica
                    </button>
                  </Link>
                  <Link href={`/dossier?id=${p.id}`}>
                    <button className="text-[9px] font-space uppercase text-white/50 hover:text-purple border border-white/10 hover:border-purple/30 px-2 py-0.5 rounded transition">
                      Dossier
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {open && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-[11px] text-text-muted">Nessuna pratica trovata per <span className="text-white">&quot;{query}&quot;</span></p>
        </div>
      )}

      {/* Placeholder when no search */}
      {!query && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-4">
          <div className="w-10 h-10 rounded-xl bg-cyan/5 border border-cyan/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan/40">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Cerca per <span className="text-white/60">nome azienda</span>, PIVA,<br />settore o stato pratica
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">
            {["Alpha", "IN ANALISI", "Tech", "ALTO"].map((hint) => (
              <button
                key={hint}
                onClick={() => { setQuery(hint); setOpen(true); }}
                className="text-[9px] font-space border border-white/10 text-white/40 hover:text-cyan hover:border-cyan/30 px-2 py-1 rounded-full transition"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
