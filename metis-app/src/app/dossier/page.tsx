"use client";
import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CCIIPanel from "@/components/CCIIPanel";
import EBAPanel from "@/components/EBAPanel";
import CentraleRischiAdapter, { buildCRAdapterData } from "@/components/CentraleRischiAdapter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { runCCIICheck } from "@/lib/cciiCompliance";
import { runEBACheck } from "@/lib/ebaCompliance";
import { getBenchmarkMetadata, refreshBenchmarks } from "@/lib/atecoBenchmarks";
import { calculateAllModels } from "@/lib/riskModels";
import FifaRiskRadar from "@/components/FifaRiskRadar";

// Mock company data for when navigating from pratica
const COMPANY_DATA: Record<number, { name: string; dossier_id: string; piva: string; lat: number; lng: number; indirizzo: string }> = {
  1:  { name: "Alpha S.p.A.",      dossier_id: "PEF-2025-A001", piva: "IT12345678901", lat: 45.4708, lng: 9.1911, indirizzo: "Via G. Verdi 42, Milano" },
  5:  { name: "Epsilon S.r.l.",    dossier_id: "PEF-2025-E005", piva: "IT55443322110", lat: 44.4949, lng: 11.3426, indirizzo: "Via Rizzoli 8, Bologna" },
  7:  { name: "Eta Holding",       dossier_id: "PEF-2025-H007", piva: "IT22334455667", lat: 45.4642, lng: 9.1900, indirizzo: "Corso Buenos Aires 15, Milano" },
  11: { name: "Lambda Group",      dossier_id: "PEF-2025-L011", piva: "IT66778800112", lat: 41.9028, lng: 12.4964, indirizzo: "Via del Corso 120, Roma" },
  15: { name: "Omicron Digital",   dossier_id: "PEF-2025-O015", piva: "IT00112244556", lat: 43.7696, lng: 11.2558, indirizzo: "Via dei Calzaiuoli 5, Firenze" },
};

export default function MetisAppWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen bg-[var(--color-void)] items-center justify-center"><span className="text-white/30 text-sm">Caricamento...</span></div>}>
      <MetisApp />
    </Suspense>
  );
}

function MetisApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = Number(searchParams.get("id") || "0");
  const companyOverride = companyId ? COMPANY_DATA[companyId] : null;

  const [step, setStep] = useState<"upload" | "loading" | "dashboard">(companyOverride ? "dashboard" : "upload");
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [apiData, setApiData] = useState<Record<string, unknown> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("altman");
  const [expandedCol, setExpandedCol] = useState<number | null>(null);
  const [showDelibera, setShowDelibera] = useState(false);
  const [complianceTab, setComplianceTab] = useState<'ccii' | 'eba'>('ccii');
  const [benchmarkMeta, setBenchmarkMeta] = useState(getBenchmarkMetadata());
  const [benchmarkRefreshing, setBenchmarkRefreshing] = useState(false);
  const [benchmarkRefreshMsg, setBenchmarkRefreshMsg] = useState('');

  // Stato di caricamento consolidato — sostituisce loadingText + backendError separati
  type LoadOp =
    | { phase: 'idle' }
    | { phase: 'running'; text: string }
    | { phase: 'error'; message: string }
    | { phase: 'done' };
  const [loadOp, setLoadOp] = useState<LoadOp>({ phase: 'idle' });
  const backendError = loadOp.phase === 'error';
  const loadingText = loadOp.phase === 'running' ? loadOp.text : '';

  const exportPDF = () => {
    const d = apiData;
    const company = companyOverride?.name || d?.company_name || "ALFA ROMEO SRL";
    const dossierId = companyOverride?.dossier_id || d?.dossier_id || "PEF-2026-X892";
    const pd = d?.kpi?.pd || "2.1%";
    const altman = d?.risk_models?.altman?.score || "3.12";
    const altmanStatus = d?.risk_models?.altman?.status || "SAFE ZONE";
    const dscr = d?.forecast_dscr?.base || "1.45x";
    const date = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

    // CCII indicators for PDF
    const cciiRows = cciiResult.indicators.map(ind => {
      const color = ind.status === 'PASS' ? '#00FF66' : ind.status === 'WARNING' ? '#FACC15' : '#FF0055';
      const bg = ind.status === 'PASS' ? '#f0fff4' : ind.status === 'WARNING' ? '#fffbeb' : '#fff1f2';
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 12px;margin-bottom:4px;background:${bg};border-left:3px solid ${color};border-radius:4px;">
        <div><div style="font-size:11px;font-weight:600;color:#1a1a2e;">${ind.nome}</div><div style="font-size:9px;color:#64748b;">${ind.articolo}</div></div>
        <span style="font-size:9px;font-weight:700;color:${color};white-space:nowrap;margin-left:8px;">${ind.status}${ind.valore !== null ? ` (${ind.valore}${ind.unita})` : ''}</span>
      </div>`;
    }).join('');

    // EBA items for PDF
    const ebaRows = ebaResult.items.map(item => {
      const color = item.status === 'CONFORME' ? '#00FF66' : item.status === 'NON CONFORME' ? '#FF0055' : item.status === 'PARZIALMENTE CONFORME' ? '#FACC15' : '#94A3B8';
      const bg = item.status === 'CONFORME' ? '#f0fff4' : item.status === 'NON CONFORME' ? '#fff1f2' : item.status === 'PARZIALMENTE CONFORME' ? '#fffbeb' : '#f8fafc';
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 12px;margin-bottom:3px;background:${bg};border-left:3px solid ${color};border-radius:4px;">
        <div><div style="font-size:10px;font-weight:600;color:#1a1a2e;">${item.titolo}</div><div style="font-size:9px;color:#64748b;">${item.paragrafo}</div></div>
        <span style="font-size:9px;font-weight:700;color:${color};white-space:nowrap;margin-left:8px;">${item.status}</span>
      </div>`;
    }).join('');

    const html = `
      <!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
      <title>Metis Report PEF — ${company}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1a1a2e; padding:0; }
        .header { background:#090D14; color:#00E5FF; padding:24px 32px; }
        .header h1 { font-size:28px; letter-spacing:8px; margin-bottom:4px; }
        .header small { color:#94A3B8; font-size:11px; display:block; margin-bottom:4px; }
        .header .badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
        .header .badge { color:#7B2CBF; font-size:9px; border:1px solid #7B2CBF44; padding:2px 8px; border-radius:4px; }
        .company-bar { background:#0e1521; color:#F1F5F9; padding:16px 32px; display:flex; justify-content:space-between; align-items:center; }
        .company-bar h2 { font-size:20px; }
        .company-bar small { color:#94A3B8; font-size:11px; }
        .section { padding:20px 32px; border-bottom:1px solid #e2e8f0; }
        .section h3 { font-size:11px; text-transform:uppercase; letter-spacing:3px; color:#00E5FF; border-bottom:1px solid #00E5FF33; padding-bottom:6px; margin-bottom:12px; }
        .section h4 { font-size:10px; text-transform:uppercase; letter-spacing:2px; color:#7B2CBF; margin:12px 0 8px; }
        .metric-row { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:5px; background:#f8fafc; border-left:3px solid #00E5FF; border-radius:4px; }
        .metric-label { font-size:11px; color:#64748b; }
        .metric-value { font-size:12px; font-weight:700; color:#1a1a2e; }
        .fair { border-color:#00FF66 } .danger { border-color:#FF0055 } .warning { border-color:#FACC15 }
        .status-box { display:inline-block; padding:4px 12px; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:1px; }
        .status-ok { background:#f0fff4; color:#00aa44; border:1px solid #00FF6633; }
        .status-warn { background:#fffbeb; color:#b45309; border:1px solid #FACC1533; }
        .status-err { background:#fff1f2; color:#be123c; border:1px solid #FF005533; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .disclaimer { margin:20px 32px 0; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:9px; color:#64748b; line-height:1.7; }
        .footer { background:#090D14; color:#475569; font-size:9px; padding:12px 32px; margin-top:20px; text-align:center; }
        @media print { .no-print { display:none; } }
      </style></head><body>
      <div class="header">
        <h1>METIS</h1>
        <small>by FINOMNIA — AI Credit Underwriting Platform</small>
        <small>PRATICA ELETTRONICA DI FIDO (PEF) — Delibera del ${date}</small>
        <div class="badges">
          <span class="badge">EU AI Act Compliant</span>
          <span class="badge">Glass-Box — Explainable AI</span>
          <span class="badge">D.Lgs. 14/2019 CCII: ${cciiResult.overallStatus}</span>
          <span class="badge">EBA/GL/2020/06: ${ebaResult.overallStatus} (${ebaResult.score}/100)</span>
        </div>
      </div>
      <div class="company-bar">
        <div><h2>${company}</h2><small>Dossier ID: ${dossierId} · P.IVA: ${displayPiva}</small></div>
        <div style="text-align:right;"><small>Data Analisi: ${date}</small><br/><small>Operatore: M. Rossi</small></div>
      </div>

      <div class="section">
        <h3>KPI Principali</h3>
        <div class="metric-row warning"><span class="metric-label">Probabilità di Default (PD) — Consensus 3 Modelli</span><span class="metric-value">${pd}</span></div>
        <div class="metric-row"><span class="metric-label">Altman Z\'-Score (1983, private firms)</span><span class="metric-value">${altman} — ${altmanStatus}</span></div>
        <div class="metric-row"><span class="metric-label">Forecast DSCR Base 12M</span><span class="metric-value">${dscr}</span></div>
        <div class="metric-row"><span class="metric-label">DSCR Stress (−20% EBITDA, +10% DS)</span><span class="metric-value">${d?.forecast_dscr?.stress || '1.02x'}</span></div>
        <div class="metric-row fair"><span class="metric-label">Fair Lending — EU AI Act Compliance</span><span class="metric-value">CONFORME — Glass-Box, No Black-Box</span></div>
      </div>

      <div class="section">
        <h3>Codice della Crisi — D.Lgs. 14/2019</h3>
        <div style="margin-bottom:8px;">
          <span class="status-box ${cciiResult.overallStatus === 'REGOLARE' ? 'status-ok' : cciiResult.overallStatus === 'ATTENZIONE' ? 'status-warn' : 'status-err'}">
            ${cciiResult.overallStatus}
          </span>
          <span style="font-size:10px;color:#64748b;margin-left:10px;">${cciiResult.alertCount} allerte · ${cciiResult.warningCount} avvisi · ${cciiResult.passCount} pass</span>
        </div>
        ${cciiRows}
        <p style="font-size:9px;color:#94A3B8;margin-top:8px;font-style:italic;">${cciiResult.note}</p>
      </div>

      <div class="section">
        <h3>EBA/GL/2020/06 — Loan Origination &amp; Monitoring</h3>
        <div style="margin-bottom:8px;">
          <span class="status-box ${ebaResult.overallStatus === 'CONFORME' ? 'status-ok' : ebaResult.overallStatus === 'PARZIALMENTE CONFORME' ? 'status-warn' : 'status-err'}">
            ${ebaResult.overallStatus}
          </span>
          <span style="font-size:10px;color:#64748b;margin-left:10px;">Score ${ebaResult.score}/100 · ${ebaResult.conformiCount} conformi · ${ebaResult.nonConformiCount} non conformi · ${ebaResult.daVerificareCount} da verificare</span>
        </div>
        ${ebaRows}
        <p style="font-size:9px;color:#94A3B8;margin-top:8px;font-style:italic;">${ebaResult.sommario}</p>
      </div>

      <div class="disclaimer">
        <strong>EU AI Act — Classificazione "Alto Rischio" (Art. 6 Reg. UE 2024/1689):</strong>
        Questo sistema è classificato come "Supporto Decisionale ad Alto Rischio" nell'ambito del Credit Scoring.
        Nessuna delibera viene eseguita automaticamente. L'operatore umano è sempre responsabile della decisione finale.
        Tutti i modelli di calcolo sono di tipo Glass-Box (Explainable AI): Altman Z'-Score (1983), Ohlson O-Score (1980), Zmijewski X-Score (1984), DSCR.
        <br/><br/>
        <strong>D.Lgs. 14/2019 (CCII):</strong> Le valutazioni sopra riportate non sostituiscono la valutazione professionale dell'organo amministrativo e di controllo ai sensi degli artt. 3 e 12 CCII.
        <strong>EBA/GL/2020/06:</strong> Checklist di conformità secondo le Linee Guida EBA sulla concessione e monitoraggio del credito, applicabili dal 30/06/2021.
        <strong>Benchmark:</strong> ${benchmarkMeta.fonte} — Anno ${benchmarkMeta.annoDati}.
      </div>
      <div class="footer">FINOMNIA S.r.l. — Metis v2.0 — Dossier: ${dossierId} — ${date} — Documento riservato ad uso interno</div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const ALLOWED_MIME = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const MAX_FILE_SIZE_MB = 20;

  const startAnalysis = async () => {
    if (!selectedFile) {
      alert("Per favore, trascina o clicca per selezionare un documento (es. Bilancio_DeltaMeccanica.txt) prima di avviare l'IA.");
      return;
    }

    // Validazione file lato client
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File troppo grande. Dimensione massima consentita: ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    if (ALLOWED_MIME.length > 0 && !ALLOWED_MIME.includes(selectedFile.type) && selectedFile.type !== '') {
      alert(`Tipo di file non supportato (${selectedFile.type || 'sconosciuto'}). Usa PDF, TXT o XLSX.`);
      return;
    }

    setStep("loading");
    setLoadOp({ phase: 'running', text: 'Inizializzazione Swarm Multi-Agente...' });

    // Simulate loading text phases
    setTimeout(() => setLoadOp({ phase: 'running', text: 'Agent_OCR: Estrazione dati da Bilancio XBRL...' }), 800);
    setTimeout(() => setLoadOp({ phase: 'running', text: 'Agent_Math: Calcolo Altman Z-Score e DSCR...' }), 1400);
    setTimeout(() => setLoadOp({ phase: 'running', text: 'Agent_Compliance: Validazione pattern Centrale Rischi...' }), 2000);
    setTimeout(() => setLoadOp({ phase: 'running', text: 'Agent_News: Crawling reputazionale NLP...' }), 2500);
    setTimeout(() => setLoadOp({ phase: 'running', text: 'Agent_Writer: Compilazione moduli Narrativi PEF...' }), 3000);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Call the FastAPI orchestrator running on port 8000
      const res = await fetch("http://localhost:8000/api/v1/analyze-dossier", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setApiData(data);
      setLoadOp({ phase: 'done' });
      setTimeout(() => setStep("dashboard"), 500);
    } catch (e) {
      console.error("Backend non raggiungibile. Fallback static mock.", e);
      setLoadOp({ phase: 'error', message: 'Backend non raggiungibile — dati dimostrativi in uso. Avvia il server FastAPI su porta 8000.' });
      setTimeout(() => setStep("dashboard"), 500);
    }
  };

  if (step === "upload") {
    return (
      <main className="flex h-screen w-screen overflow-hidden font-space">
        <Sidebar />

        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[var(--color-void)]">

        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(123,44,191,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(0,229,255,0.1),_transparent_50%)] pointer-events-none"></div>
        <div className="absolute top-[20%] left-[15%] w-64 h-64 bg-purple/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-cyan/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Two-Panel Card */}
        <div className="relative z-10 flex flex-col md:flex-row max-w-[1000px] w-full mx-6 rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Left Panel — Brand */}
          <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-black/80 to-[rgba(14,21,33,1)] border-r border-white/5 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-12 h-12 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
                <span className="font-space font-bold text-3xl tracking-widest text-white">METIS</span>
              </div>
              <div className="inline-block border border-cyan/30 bg-cyan/10 text-cyan text-[10px] font-space tracking-widest uppercase px-3 py-1 rounded-full mb-8">
                AI Credit Underwriting v2.0
              </div>
              <h2 className="text-3xl font-light text-white leading-tight mb-6">
                Analisi <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple">Automatica.</span><br/>
                Decisione con <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green to-yellow">Fiducia.</span>
              </h2>
              <p className="text-text-muted text-sm leading-relaxed max-w-sm">
                Carica un bilancio aziendale o una visura Centrale Rischi. Lo Swarm Multi-Agente elaborerà il dossier in pochi secondi, in modalità Glass-Box conforme EU AI Act.
              </p>

              <div className="mt-8 space-y-3">
                {['EU AI Act Conforme', 'D.Lgs. 14/2019 CCII', 'EBA/GL/2020/06', 'Glass-Box — No Black Box'].map(badge => (
                  <div key={badge} className="flex items-center gap-2 text-white/60 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0"></div>
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-16 font-space text-[10px] tracking-widest uppercase text-text-muted opacity-50">
              Powered by Finomnia AI Research
            </div>
          </div>

          {/* Right Panel — Upload */}
          <div className="flex flex-col justify-center w-full md:w-1/2 p-10 lg:p-14 bg-[rgba(9,13,20,0.6)] backdrop-blur-md">
            
            <div className="mb-8">
              <h3 className="font-space text-2xl font-bold text-white mb-2">Carica Nuovo Dossier</h3>
              <p className="text-text-muted text-xs">Trascina o clicca per selezionare il documento da analizzare.</p>
            </div>

            {/* Drop Zone */}
            <div className="relative border-2 border-dashed border-white/10 hover:border-cyan/60 transition-all rounded-xl p-10 mb-6 cursor-pointer bg-black/20 group">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cyan/10 flex items-center justify-center group-hover:bg-cyan/20 transition border border-cyan/20 group-hover:border-cyan/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-cyan">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-space text-base text-white text-center mb-1">Trascina qui i documenti cliente</p>
              <p className="text-xs text-text-muted text-center">PDF • XBRL • TXT — Bilancio, Visura CR</p>
              
              {selectedFile && (
                <div className="mt-5 flex items-center gap-2 justify-center bg-cyan/10 border border-cyan/20 py-2 px-4 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse"></div>
                  <p className="font-space text-sm text-cyan">Riconosciuto: <strong>{selectedFile.name}</strong></p>
                </div>
              )}
            </div>

            <button 
              onClick={startAnalysis}
              className="w-full py-3.5 rounded-lg font-space font-bold uppercase tracking-widest transition-all relative overflow-hidden group border border-transparent bg-gradient-to-r from-purple to-cyan text-white hover:shadow-[0_0_25px_rgba(123,44,191,0.4)]"
            >
              <span className="relative z-10">Avvia Analisi Multi-Agente</span>
              <div className="absolute inset-0 -translate-x-full bg-white/10 skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            <div className="mt-6 text-center text-xs text-text-muted">
              Nessun dato trasmesso a terzi · Elaborazione locale conforme GDPR
            </div>
          </div>
        </div>
        </div>
      </main>
    );
  }

  if (step === "loading") {
    return (
      <main className="flex flex-col items-center justify-center h-screen w-screen overflow-hidden">
        <div className="w-20 h-20 border-[3px] border-cyan border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_var(--color-cyan)]"></div>
        <p className="font-space text-lg text-cyan tracking-widest animate-pulse">{loadingText}</p>
        <div className="w-64 h-1 bg-white/10 mt-6 rounded-full overflow-hidden">
          <div className="h-full bg-purple animate-[progress_3.5s_ease-out_forwards]"></div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress { from { width: 0%; } to { width: 100%; } }
        `}} />
      </main>
    );
  }

  const safeData = apiData?.kpi ? apiData : null;
  // Use company override from pratica navigation
  const displayName = companyOverride?.name || safeData?.company_name || "ALFA ROMEO SRL";
  const displayDossier = companyOverride?.dossier_id || safeData?.dossier_id || "PEF-2026-X892";
  const displayPiva = companyOverride?.piva || safeData?.company_info?.partita_iva || "IT12345678901";
  const displayLat = companyOverride?.lat || safeData?.company_info?.lat || 45.4708;
  const displayLng = companyOverride?.lng || safeData?.company_info?.lng || 9.1911;
  const displayIndirizzo = companyOverride?.indirizzo || safeData?.company_info?.indirizzo || "Via G. Verdi 42, Milano";

  // ── CCII / EBA / CR computations ─────────────────────────────────────────────
  // useMemo evita il ricalcolo ad ogni re-render — si ricalcola solo quando
  // cambiano displayName, displayPiva o safeData (che dipendono da apiData).
  const { mockModelsData, cciiResult, ebaResult } = useMemo(() => {
    const bilancio = {
      companyName: displayName, partitaIva: displayPiva, settore: (safeData as any)?.benchmark?.settore_ateco || 'G46',
      dataChiusura: '31/12/2023',
      ricavi: 2450000, costiOperativi: 2000000, ebitda: 294000, ebitdaMargin: 12,
      ammortamenti: 45000, ebit: 249000, oneriFinanziari: 68000,
      risultatoLordo: 181000, imposte: 54000, utileNetto: 127000,
      totaleAttivo: 1850000, attivoCorrenti: 920000, cassa: 85000,
      crediti: 680000, rimanenze: 155000, attivoFisso: 930000,
      totalePassivo: 1850000, passivoCorrenti: 780000,
      debitiVersoBanche: 680000, debitiBreveTermine: 420000,
      debitiLungoTermine: 260000, totaleDebiti: 1420000,
      patrimonioNetto: 430000, capitaleSociale: 100000,
      utiliPortati: 303000, capitaleDiLavoro: 140000,
      utiliNonDistribuiti: 303000, fatturato: 2450000,
      valoreAzioneMercato: 430000, debtService: 203000,
    };
    const models = calculateAllModels(bilancio as any);
    return {
      mockModelsData: models,
      cciiResult: runCCIICheck(bilancio as any, models),
      ebaResult: runEBACheck(bilancio as any, models),
    };
  }, [displayName, displayPiva, safeData]);

  const crData = useMemo(
    () => buildCRAdapterData(displayPiva, safeData as any),
    [displayPiva, safeData]
  );

  const handleBenchmarkRefresh = async () => {
    setBenchmarkRefreshing(true);
    setBenchmarkRefreshMsg('Connessione a ISTAT SBS API...');
    const updated = await refreshBenchmarks((msg) => setBenchmarkRefreshMsg(msg));
    setBenchmarkMeta(updated);
    setBenchmarkRefreshing(false);
    setTimeout(() => setBenchmarkRefreshMsg(''), 3000);
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden relative text-[13px] tracking-wide animate-[fadeUp_0.5s_ease-out_forwards]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-6 h-full overflow-hidden">
        {backendError && loadOp.phase === 'error' && (
          <div className="flex items-center gap-2 bg-yellow/10 border border-yellow/30 text-yellow text-xs font-space px-4 py-2 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {loadOp.message}
          </div>
        )}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
            <h1 className="font-space text-2xl font-semibold text-white">
              Dossier: {displayName} <span className="text-text-muted text-base ml-3 font-normal">ID: {displayDossier}</span>
            </h1>
          </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 text-xs font-space border border-cyan/30 text-cyan hover:bg-cyan/10 px-4 py-1.5 rounded-lg transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Export PDF
            </button>
            <div className="border border-purple text-purple px-4 py-1.5 rounded-full text-xs font-semibold uppercase shadow-[0_0_10px_rgba(123,44,191,0.2)] animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple"></div> Elaborazione Completata
            </div>
          </div>
        </header>

        <div className={`grid ${expandedCol !== null ? 'grid-cols-1' : 'grid-cols-[1.1fr_1.3fr_1fr]'} gap-6 h-full min-h-0 transition-all duration-300`}>
          
          {/* Column 1: Sources */}
          <section className={`glass-panel flex flex-col overflow-hidden ${expandedCol !== null && expandedCol !== 1 ? 'hidden' : ''}`}>
            <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl flex justify-between items-center">
              <span>1. Raw Data Sources (OCR)</span>
              <button onClick={() => setExpandedCol(expandedCol === 1 ? null : 1)} className="text-text-muted hover:text-cyan transition p-1 rounded hover:bg-white/5" title={expandedCol === 1 ? 'Riduci' : 'Espandi'}>
                {expandedCol === 1 ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 10l5 5m0 0v-4m0 4h-4" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                )}
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">

              {/* Company Location + Struttura Societaria */}
              <div className="border border-glass-border rounded-lg mb-4 bg-black/30 overflow-hidden">
                <iframe 
                  src={`https://www.google.com/maps?q=${displayLat},${displayLng}&z=15&output=embed`}
                  className="w-full h-[140px] border-0 opacity-80"
                  loading="lazy"
                  allowFullScreen
                ></iframe>
                <div className="p-4">
                  <div className="flex gap-1 mb-3 bg-black/40 p-0.5 rounded">
                    <button onClick={() => setSelectedModel(selectedModel === '_addr' ? 'altman' : '_addr')}
                      className={`flex-1 py-1 rounded text-[10px] font-space font-semibold tracking-wider transition ${selectedModel === '_addr' ? 'bg-cyan/20 text-cyan' : 'text-text-muted hover:text-white'}`}>Indirizzo</button>
                    <button onClick={() => setSelectedModel(selectedModel === '_corp' ? 'altman' : '_corp')}
                      className={`flex-1 py-1 rounded text-[10px] font-space font-semibold tracking-wider transition ${selectedModel === '_corp' ? 'bg-cyan/20 text-cyan' : 'text-text-muted hover:text-white'}`}>Struttura Societaria</button>
                  </div>

                  {selectedModel === '_addr' && (
                    <div className="text-[11px] text-text-muted space-y-1.5 animate-[fadeUp_0.2s_ease-out]">
                      <div className="flex justify-between"><span className="text-text-muted">Sede Legale</span><span className="text-white font-medium">{displayIndirizzo}</span></div>
                      <div className="flex justify-between"><span>Forma Giuridica</span><span className="text-white">{safeData?.company_info?.forma_giuridica || 'SRL'}</span></div>
                      <div className="flex justify-between"><span>P.IVA</span><span className="text-white font-mono text-[10px]">{displayPiva}</span></div>
                      <div className="flex justify-between"><span>PEC</span><span className="text-cyan text-[10px]">{safeData?.company_info?.pec || ''}</span></div>
                      <div className="flex justify-between"><span>REA</span><span className="text-white">{safeData?.company_info?.rea || ''}</span></div>
                      <div className="flex justify-between"><span>Capitale Sociale</span><span className="text-white font-semibold">{safeData?.company_info?.capitale_sociale || ''}</span></div>
                      <div className="flex justify-between"><span>Costituzione</span><span className="text-white">{safeData?.company_info?.data_costituzione || ''}</span></div>
                    </div>
                  )}

                  {selectedModel === '_corp' && (
                    <div className="space-y-2 animate-[fadeUp_0.2s_ease-out]">
                      {(safeData?.company_info?.struttura_societaria || [{nome:'Mario Rossi',ruolo:'Amm. Unico',quota:'60%'}]).map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-black/20 rounded p-2 border border-glass-border">
                          <div>
                            <div className="text-[11px] text-white font-semibold">{s.nome}</div>
                            <div className="text-[9px] text-text-muted">{s.ruolo}</div>
                          </div>
                          <span className="font-space text-sm text-cyan font-bold">{s.quota}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedModel !== '_addr' && selectedModel !== '_corp' && (
                    <div className="text-[10px] text-text-muted text-center py-1">Clicca su un tab per i dettagli</div>
                  )}
                </div>
              </div>
              {/* Centrale Rischi Adapter */}
              <div className="border border-glass-border rounded-lg p-4 mb-4 bg-black/30 transition hover:border-glass-hover">
                <ErrorBoundary label="Centrale Rischi">
                  <CentraleRischiAdapter data={crData} />
                </ErrorBoundary>
              </div>

              <div className="border border-glass-border rounded-lg p-5 mb-4 bg-black/30 transition hover:border-glass-hover">
                <div className="font-space text-sm font-semibold mb-3 text-white">Lettura Sensori IA</div>
                <div className="text-[13px] text-text-muted leading-relaxed">
                  Ricavi: € 2.450.000<br/>
                  <span className={`px-1 py-0.5 rounded cursor-default border-b border-dashed border-cyan transition-colors duration-300 ${hoveredLink === 'ebitda' ? 'bg-cyan text-black shadow-[0_0_8px_var(--color-cyan)]' : 'bg-cyan-dim text-cyan'}`}>
                    EBITDA (Stimato): 12%
                  </span><br/>
                  Debiti v/Banche: Lineare<br/>
                  Cassa: Stabile
                </div>
              </div>
            </div>
          </section>

          {/* Column 2: Agentic Output */}
          <section className={`glass-panel flex flex-col overflow-hidden ${expandedCol !== null && expandedCol !== 2 ? 'hidden' : ''}`}>
             <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl flex justify-between items-center">
              <span>2. Narrative Generation (XAI)</span>
              <button onClick={() => setExpandedCol(expandedCol === 2 ? null : 2)} className="text-text-muted hover:text-cyan transition p-1 rounded hover:bg-white/5" title={expandedCol === 2 ? 'Riduci' : 'Espandi'}>
                {expandedCol === 2 ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 10l5 5m0 0v-4m0 4h-4" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                )}
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pr-3">
              
              <div className="mb-6 animate-[fadeUp_0.6s_ease-out_forwards] opacity-0 translate-y-4" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-purple shadow-[0_0_8px_var(--color-purple)]"></div>
                  <div className="font-space text-[11px] text-text-muted uppercase tracking-widest">{safeData ? safeData.xai_narrative[0].agent : 'Agent_Writer'} • Sintesi Storica</div>
                </div>
                <div className="bg-white/5 border border-glass-border p-5 rounded-lg border-l-2 border-l-purple leading-relaxed">
                  {safeData ? (
                     <p dangerouslySetInnerHTML={{__html: safeData.xai_narrative[0].html_text}} 
                        onMouseEnter={(e) => { if((e.target as any).tagName === "SPAN") setHoveredLink('ebitda') }} 
                        onMouseLeave={() => setHoveredLink(null)} />
                  ) : (
                    <>
                      <p className="mb-3">L'azienda presenta un fatturato in crescita, ma si evidenzia un <span onMouseEnter={() => setHoveredLink('ebitda')} onMouseLeave={() => setHoveredLink(null)} className="text-cyan cursor-crosshair border-b border-dotted border-cyan hover:bg-cyan-dim transition px-0.5 font-medium">calo dell'EBITDA margin</span> rispetto agli esercizi passati.</p>
                      <p>Dal controllo documentale della visura emerge tensione di liquidità di breve termine.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-6 animate-[fadeUp_0.6s_ease-out_forwards] opacity-0 translate-y-4" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-yellow shadow-[0_0_8px_var(--color-yellow)]"></div>
                  <div className="font-space text-[11px] text-text-muted uppercase tracking-widest">{safeData ? safeData.xai_narrative[1].agent : 'Agent_Compliance'} • Anomalie CR</div>
                </div>
                <div className="bg-[rgba(250,204,21,0.05)] border border-glass-border p-5 rounded-lg border-l-2 border-l-yellow leading-relaxed">
                  {safeData ? (
                     <p dangerouslySetInnerHTML={{__html: safeData.xai_narrative[1].html_text}} 
                        onMouseEnter={(e) => { if((e.target as any).tagName === "SPAN") setHoveredLink('scaduti') }} 
                        onMouseLeave={() => setHoveredLink(null)} />
                  ) : (
                    <p><strong>ATTENZIONE:</strong> Rilevato pattern irregolare negli andamentali. Troviamo <span onMouseEnter={() => setHoveredLink('scaduti')} onMouseLeave={() => setHoveredLink(null)} className="text-yellow cursor-crosshair border-b border-dotted border-yellow hover:bg-[rgba(250,204,21,0.15)] transition px-0.5 font-medium">scaduti persistenti per € 45.200</span> sulle linee autoliquidanti da oltre 60 giorni.</p>
                  )}
                </div>
              </div>

              <div className="mb-6 animate-[fadeUp_0.6s_ease-out_forwards] opacity-0 translate-y-4" style={{ animationDelay: '0.7s' }}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)]"></div>
                  <div className="font-space text-[11px] text-text-muted uppercase tracking-widest">Agent_News • Web Reputation (Live Crawl)</div>
                </div>
                <div className={`bg-[rgba(0,229,255,0.05)] border border-glass-border p-5 rounded-lg border-l-2 ${
                  safeData?.sentiment?.label === "ALLERTA NEGATIVA" ? 'border-l-red' : 
                  safeData?.sentiment?.label === "MISTO" ? 'border-l-yellow' : 'border-l-cyan'
                } leading-relaxed`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-space font-semibold text-white">Sentiment NLP Scoring</span>
                    <span className={`px-2 py-0.5 rounded text-xs border tracking-wider font-semibold ${
                      safeData?.sentiment?.label === "ALLERTA NEGATIVA" ? 'bg-red/10 border-red/50 text-red' : 
                      safeData?.sentiment?.label === "MISTO" ? 'bg-yellow/10 border-yellow/50 text-yellow' :
                      'bg-cyan/10 border-cyan/50 text-cyan'
                    }`}>{safeData?.sentiment?.score || 50}/100 {safeData?.sentiment?.label || 'NEUTRO'}</span>
                  </div>
                  <p className="text-[12px] text-text-muted mb-3">{safeData?.sentiment?.summary || "Crawling in corso..."}</p>
                  {safeData?.sentiment?.sources && safeData.sentiment.sources.length > 0 && (
                    <div className="mt-3 border-t border-glass-border pt-3 space-y-2">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider font-space mb-1">Fonti Web Rilevate</div>
                      {safeData.sentiment.sources.map((src: any, i: number) => (
                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="block bg-black/20 rounded p-2 hover:bg-cyan-dim/30 transition border border-transparent hover:border-cyan/20 cursor-pointer">
                          <div className="text-[11px] text-cyan font-medium truncate">{src.title}</div>
                          <div className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{src.snippet}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* Column 3: Matrices & KPIs */}
          <section className={`glass-panel flex flex-col overflow-hidden ${expandedCol !== null && expandedCol !== 3 ? 'hidden' : ''}`}>
             <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl flex justify-between items-center">
              <span>3. Dashboards &amp; Matrices</span>
              <button onClick={() => setExpandedCol(expandedCol === 3 ? null : 3)} className="text-text-muted hover:text-cyan transition p-1 rounded hover:bg-white/5" title={expandedCol === 3 ? 'Riduci' : 'Espandi'}>
                {expandedCol === 3 ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m6 10l5 5m0 0v-4m0 4h-4" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                )}
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              
              {/* FIFA-style Risk Radar — replaces accordion */}
              <div className="mb-6 bg-black/20 border border-glass-border rounded-xl p-4">
                <div className="text-[10px] text-text-muted uppercase tracking-widest font-space mb-3">Credit Risk Radar</div>
                <FifaRiskRadar compact={false} />
              </div>

              {/* DSCR Forecast - 3 Scenari (Module 7) */}
              <div className="mb-6 bg-black/20 border border-glass-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-space text-xs tracking-widest text-text-muted uppercase">Forecast DSCR Prospettico 12M</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                    safeData?.forecast_dscr?.scenario_selezionato === 'STRESS' ? 'border-red/50 text-red bg-red/10' : 'border-green/50 text-green bg-green/10'
                  }`}>Scenario: {safeData?.forecast_dscr?.scenario_selezionato || 'BASE'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className={`text-center p-3 rounded-lg border ${safeData?.forecast_dscr?.scenario_selezionato === 'BASE' && parseFloat(safeData?.forecast_dscr?.ottimistico) >= 1 ? 'border-green/30 bg-green/5' : 'border-glass-border bg-black/20'}`}>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Ottimistico</div>
                    <div className="font-space text-2xl text-green font-bold mt-1">{safeData?.forecast_dscr?.ottimistico || '1.67x'}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg border ${safeData?.forecast_dscr?.scenario_selezionato === 'BASE' ? 'border-cyan/40 bg-cyan/5 ring-1 ring-cyan/20' : 'border-glass-border bg-black/20'}`}>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Base</div>
                    <div className={`font-space text-2xl font-bold mt-1 ${parseFloat(safeData?.forecast_dscr?.base) >= 1 ? 'text-cyan' : 'text-red'}`}>{safeData?.forecast_dscr?.base || '1.45x'}</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg border ${safeData?.forecast_dscr?.scenario_selezionato === 'STRESS' ? 'border-red/40 bg-red/5 ring-1 ring-red/20' : 'border-glass-border bg-black/20'}`}>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Stress</div>
                    <div className={`font-space text-2xl font-bold mt-1 ${parseFloat(safeData?.forecast_dscr?.stress) >= 1 ? 'text-yellow' : 'text-red'}`}>{safeData?.forecast_dscr?.stress || '1.02x'}</div>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted border-l-2 border-glass-border pl-2 leading-relaxed">{safeData?.forecast_dscr?.nota || 'Scenario selezionato automaticamente in base ai trend CR e di bilancio.'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-black/20 border border-glass-border rounded-lg p-4 text-center relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-yellow shadow-sm">
                  <div className="text-xs text-text-muted font-space uppercase tracking-wide">Probabilità di Default (PD)</div>
                  <div className="font-space text-3xl my-2 text-yellow font-bold">{safeData?.kpi.pd || '2.1%'}</div>
                </div>
              </div>

              {/* SWOT */}
              <div className="mb-6">
                <div className="font-space text-sm mb-3 text-white tracking-widest uppercase opacity-80">Matrice SWOT</div>
                <div className="grid grid-cols-2 grid-rows-2 gap-[2px] border border-glass-border rounded-lg bg-black/40 overflow-hidden h-[200px]">
                  <div className="bg-[rgba(0,255,102,0.08)] p-3 flex flex-col transition hover:bg-[rgba(0,255,102,0.12)]">
                    <div className="font-space text-[10px] tracking-wider uppercase mb-2 text-green font-semibold">Strengths</div>
                    <ul className="text-[11px] text-slate-200 ml-3 list-disc leading-relaxed">
                      {safeData ? safeData.swot_matrix.strengths.map((s:string, i:number) => <li key={i}>{s}</li>) : <li>Fatturato Crescente</li>}
                    </ul>
                  </div>
                  <div className="bg-[rgba(250,204,21,0.05)] p-3 flex flex-col transition hover:bg-[rgba(250,204,21,0.1)]">
                    <div className="font-space text-[10px] tracking-wider uppercase mb-2 text-yellow font-semibold">Weaknesses</div>
                    <ul className="text-[11px] text-slate-200 ml-3 list-disc leading-relaxed">
                       {safeData ? safeData.swot_matrix.weaknesses.map((s:string, i:number) => <li key={i}>{s}</li>) : <li>EBITDA in calo</li>}
                    </ul>
                  </div>
                  <div className="bg-[rgba(0,229,255,0.06)] p-3 flex flex-col transition hover:bg-[rgba(0,229,255,0.1)]">
                    <div className="font-space text-[10px] tracking-wider uppercase mb-2 text-cyan font-semibold">Opportunities</div>
                    <ul className="text-[11px] text-slate-200 ml-3 list-disc leading-relaxed">
                       {safeData ? safeData.swot_matrix.opportunities.map((s:string, i:number) => <li key={i}>{s}</li>) : <li>Settore ATECO in boom</li>}
                    </ul>
                  </div>
                  <div className="bg-[rgba(255,0,85,0.05)] p-3 flex flex-col transition hover:bg-[rgba(255,0,85,0.1)]">
                    <div className="font-space text-[10px] tracking-wider uppercase mb-2 text-red font-semibold">Threats</div>
                    <ul className="text-[11px] text-slate-200 ml-3 list-disc leading-relaxed">
                       {safeData ? safeData.swot_matrix.threats.map((s:string, i:number) => <li key={i}>{s}</li>) : <li>Tassi BCE</li>}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Benchmark ATECO (Module 4) — with ISTAT refresh */}
              <div className="mb-6 bg-black/20 border border-glass-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-space text-xs tracking-widest text-text-muted uppercase">Benchmark Settore ISTAT</div>
                  <button
                    onClick={handleBenchmarkRefresh}
                    disabled={benchmarkRefreshing}
                    className="flex items-center gap-1.5 text-[9px] text-cyan border border-cyan/30 bg-cyan/5 hover:bg-cyan/15 px-2 py-1 rounded transition disabled:opacity-40"
                  >
                    <svg className={`w-2.5 h-2.5 ${benchmarkRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {benchmarkRefreshing ? 'Aggiornamento...' : 'Aggiorna ISTAT'}
                  </button>
                </div>
                {benchmarkRefreshMsg && (
                  <div className="text-[9px] text-cyan/70 mb-2 animate-pulse">{benchmarkRefreshMsg}</div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-text-muted">{safeData?.benchmark?.settore_ateco || 'G46 — Commercio all\'ingrosso'}</span>
                  <span className="text-[8px] text-text-muted border border-glass-border px-1.5 py-0.5 rounded">
                    Anno {benchmarkMeta.annoDati} · {new Date(benchmarkMeta.lastUpdated).toLocaleDateString('it-IT')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="text-center">
                    <div className="text-[10px] text-text-muted">DSCR Media</div>
                    <div className="font-space text-lg text-white font-bold">{safeData?.benchmark?.media_dscr_settore || '1.25x'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-text-muted">EBITDA% Media</div>
                    <div className="font-space text-lg text-white font-bold">{safeData?.benchmark?.media_ebitda_settore || '9.8%'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-text-muted">Posizione</div>
                    <div className={`font-space text-sm font-bold mt-1 px-2 py-0.5 rounded ${
                      safeData?.benchmark?.posizione_vs_settore === 'SOTTO MEDIA' ? 'bg-red/10 text-red' : 'bg-green/10 text-green'
                    }`}>{safeData?.benchmark?.posizione_vs_settore || 'SOPRA MEDIA'}</div>
                  </div>
                </div>
                <div className="text-[8px] text-text-muted border-t border-glass-border pt-1.5">{benchmarkMeta.fonte}</div>
              </div>

              {/* CR Pattern 12 Mesi (Module 5) */}
              <div className="mb-6 bg-black/20 border border-glass-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-space text-xs tracking-widest text-text-muted uppercase">Pattern CR 12 Mesi</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                    safeData?.cr_pattern?.trend === 'DETERIORAMENTO' ? 'border-red/50 text-red bg-red/10' : 'border-green/50 text-green bg-green/10'
                  }`}>{safeData?.cr_pattern?.trend || 'STABILE'}</span>
                </div>
                <div className="flex items-end gap-[3px] h-14">
                  {(safeData?.cr_pattern?.utilizzato_pct || [72,74,78,76,80,82,85,83,88,90,86,78]).map((v: number, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-t transition-all ${
                          v > 90 ? 'bg-red' : v > 80 ? 'bg-yellow' : 'bg-cyan'
                        }`}
                        style={{ height: `${v * 0.55}px` }}
                      ></div>
                      <span className="text-[8px] text-text-muted">{(safeData?.cr_pattern?.mesi || ['M','A','M','G','L','A','S','O','N','D','G','F'])[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Check Semaphore (Module 6) */}
              <div className={`mb-6 border rounded-lg p-4 ${
                safeData?.cross_check?.alert ? 'border-red/50 bg-red/5' : 'border-green/50 bg-green/5'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full shadow-lg ${
                    safeData?.cross_check?.alert ? 'bg-red shadow-red/50 animate-pulse' : 'bg-green shadow-green/50'
                  }`}></div>
                  <div>
                    <div className="font-space text-xs tracking-widest uppercase font-semibold text-white">Cross-Check Bilancio ↔ CR</div>
                    <div className={`text-[11px] mt-1 ${
                      safeData?.cross_check?.alert ? 'text-red' : 'text-green'
                    }`}>
                      Mismatch Debiti: {safeData?.cross_check?.mismatch_pct || '15.3'}%
                      {safeData?.cross_check?.alert ? ' ⚠️ ANOMALIA RILEVATA' : ' ✓ Nei limiti'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Compliance Normativa: CCII + EBA ─────────────────────────── */}
              <div className="mb-4 bg-black/20 border border-glass-border rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="p-3 border-b border-glass-border bg-black/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple shadow-[0_0_6px_var(--color-purple)]"></div>
                    <span className="font-space text-[11px] text-white font-semibold tracking-wider uppercase">Compliance Normativa</span>
                  </div>
                  <div className="flex gap-1">
                    {/* CCII overall badge */}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-space font-semibold ${
                      cciiResult.overallStatus === 'REGOLARE' ? 'text-green border-green/30 bg-green/10' :
                      cciiResult.overallStatus === 'ATTENZIONE' ? 'text-yellow border-yellow/30 bg-yellow/10' :
                      'text-red border-red/30 bg-red/10'
                    }`}>CCII: {cciiResult.overallStatus}</span>
                    {/* EBA overall badge */}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-space font-semibold ${
                      ebaResult.overallStatus === 'CONFORME' ? 'text-green border-green/30 bg-green/10' :
                      ebaResult.overallStatus === 'PARZIALMENTE CONFORME' ? 'text-yellow border-yellow/30 bg-yellow/10' :
                      'text-red border-red/30 bg-red/10'
                    }`}>EBA: {ebaResult.score}/100</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-glass-border">
                  <button
                    onClick={() => setComplianceTab('ccii')}
                    className={`flex-1 py-2.5 text-[10px] font-space font-semibold tracking-wider uppercase transition border-b-2 ${
                      complianceTab === 'ccii'
                        ? 'border-b-purple text-purple bg-purple/5'
                        : 'border-b-transparent text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    D.Lgs. 14/2019 — CCII
                  </button>
                  <button
                    onClick={() => setComplianceTab('eba')}
                    className={`flex-1 py-2.5 text-[10px] font-space font-semibold tracking-wider uppercase transition border-b-2 ${
                      complianceTab === 'eba'
                        ? 'border-b-cyan text-cyan bg-cyan/5'
                        : 'border-b-transparent text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    EBA/GL/2020/06
                  </button>
                </div>

                {/* Panel content */}
                <div className="p-4">
                  {complianceTab === 'ccii' && (
                    <div className="animate-[fadeUp_0.2s_ease-out_forwards]">
                      <ErrorBoundary label="CCII Panel">
                        <CCIIPanel result={cciiResult} />
                      </ErrorBoundary>
                    </div>
                  )}
                  {complianceTab === 'eba' && (
                    <div className="animate-[fadeUp_0.2s_ease-out_forwards]">
                      <ErrorBoundary label="EBA Panel">
                        <EBAPanel result={ebaResult} />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>

      {/* EU AI Act Disclaimer (Footer) */}
      <div className="absolute bottom-0 right-[70px] left-[70px] bg-[rgba(123,44,191,0.06)] border-t border-purple/20 py-1 px-6 text-center z-40">
        <span className="text-[9px] text-purple/70 tracking-wider font-space">EU AI Act Compliance: Questo sistema è classificato come &quot;Supporto Decisionale&quot;. Nessuna delibera automatica. L&apos;umano è responsabile finale.</span>
      </div>

      {/* Floating Action Bar - DELIBERA */}
      {step === "dashboard" && safeData && (
        <>
          {/* Toggle Button */}
          <button onClick={() => setShowDelibera(!showDelibera)}
            className={`fixed bottom-6 right-8 z-50 w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-all duration-300 ${
              showDelibera ? 'bg-red/20 border-red/50 text-red hover:bg-red/30' : 'bg-cyan/20 border-cyan/50 text-cyan hover:bg-cyan/30 animate-pulse'
            }`}
            title={showDelibera ? 'Chiudi Delibera' : 'Apri Delibera'}>
            {showDelibera ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </button>

          {/* Delibera Bar */}
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[rgba(9,13,20,0.95)] border border-glass-border p-3 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-50 transition-all duration-500 ${
            showDelibera ? 'translate-y-0 opacity-100' : 'translate-y-[120px] opacity-0 pointer-events-none'
          }`}>
            <div className="px-5 font-space text-xs text-white uppercase tracking-widest border-r border-glass-border font-bold">Azione Comitato Deliberante</div>
            <button 
               onClick={() => alert("✅ Pratica PEF Approvata. Generazione del fascicolo in PDF per il Comitato Crediti avviata con esito positivo.")}
               className="bg-[rgba(0,255,102,0.1)] hover:bg-[rgba(0,255,102,0.2)] hover:shadow-[0_0_15px_rgba(0,255,102,0.2)] border border-[rgba(0,255,102,0.4)] text-green px-6 py-2.5 rounded-full font-space text-[13px] font-bold tracking-wider transition">
              APPROVA PEF
            </button>
            <button 
               onClick={() => alert("⏳ Pratica Sospesa. Le richieste di integrazione documentale sono state notificate al Gestore Corporate.")}
               className="bg-[rgba(250,204,21,0.1)] hover:bg-[rgba(250,204,21,0.2)] hover:shadow-[0_0_15px_rgba(250,204,21,0.2)] border border-[rgba(250,204,21,0.4)] text-yellow px-6 py-2.5 rounded-full font-space text-[13px] font-bold tracking-wider transition">
              RICHIEDI INTEGRAZIONI
            </button>
            <button 
               onClick={() => alert("❌ Pratica Declinata definitivamente. Verbale di diniego e inserimento motivazione in piattaforma.")}
               className="bg-[rgba(255,0,85,0.1)] hover:bg-[rgba(255,0,85,0.2)] hover:shadow-[0_0_15px_rgba(255,0,85,0.2)] border border-[rgba(255,0,85,0.4)] text-red px-6 py-2.5 rounded-full font-space text-[13px] font-bold tracking-wider transition">
              BOCCIA PRATICA
            </button>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </main>
  );
}
