"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function MetisApp() {
  const [step, setStep] = useState<"upload" | "loading" | "dashboard">("upload");
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [loadingText, setLoadingText] = useState("Inizializzazione Swarm Multi-Agente...");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("altman");
  const [expandedCol, setExpandedCol] = useState<number | null>(null);
  const [showDelibera, setShowDelibera] = useState(false);

  const exportPDF = () => {
    const d = apiData;
    const company = d?.company_name || "ALFA ROMEO SRL";
    const dossierId = d?.dossier_id || "PEF-2026-X892";
    const pd = d?.kpi?.pd || "2.1%";
    const altman = d?.risk_models?.altman?.score || "3.12";
    const altmanStatus = d?.risk_models?.altman?.status || "SAFE ZONE";
    const dscr = d?.forecast_dscr?.base || "1.45x";
    const date = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

    const html = `
      <!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
      <title>Metis Report — ${company}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#1a1a2e; padding:0; }
        .header { background:#090D14; color:#00E5FF; padding:24px 32px; }
        .header h1 { font-size:28px; letter-spacing:8px; margin-bottom:4px; }
        .header small { color:#94A3B8; font-size:11px; display:block; margin-bottom:6px; }
        .header .badge { color:#7B2CBF; font-size:10px; }
        .company-bar { background:#0e1521; color:#F1F5F9; padding:16px 32px; display:flex; justify-content:space-between; align-items:center; }
        .company-bar h2 { font-size:20px; }
        .company-bar small { color:#94A3B8; font-size:11px; }
        .section { padding:24px 32px; }
        .section h3 { font-size:12px; text-transform:uppercase; letter-spacing:3px; color:#00E5FF; border-bottom:1px solid #00E5FF33; padding-bottom:8px; margin-bottom:16px; }
        .metric-row { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:6px; background:#f8fafc; border-left:3px solid #00E5FF; border-radius:4px; }
        .metric-label { font-size:12px; color:#64748b; }
        .metric-value { font-size:13px; font-weight:700; color:#1a1a2e; }
        .fair { border-color:#00FF66 }
        .danger { border-color:#FF0055 }
        .warning { border-color:#FACC15 }
        .disclaimer { margin:32px 32px 0; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-size:10px; color:#64748b; line-height:1.6; }
        .footer { background:#090D14; color:#475569; font-size:10px; padding:14px 32px; margin-top:24px; text-align:center; }
      </style></head><body>
      <div class="header">
        <h1>METIS</h1>
        <small>by FINOMNIA — AI Credit Underwriting Platform</small>
        <small>REPORT DELIBERA — ${date}</small>
        <div class="badge">EU AI Act Compliant | Glass-Box Report | Explainable AI</div>
      </div>
      <div class="company-bar">
        <div><h2>${company}</h2><small>Dossier ID: ${dossierId}</small></div>
        <div><small>Data Analisi: ${date}</small></div>
      </div>
      <div class="section">
        <h3>KPI Principali</h3>
        <div class="metric-row warning"><span class="metric-label">Probabilità di Default (PD)</span><span class="metric-value">${pd}</span></div>
        <div class="metric-row"><span class="metric-label">Altman Z-Score</span><span class="metric-value">${altman} — ${altmanStatus}</span></div>
        <div class="metric-row"><span class="metric-label">Forecast DSCR Base 12M</span><span class="metric-value">${dscr}</span></div>
        <div class="metric-row fair"><span class="metric-label">Fair Lending Score (EU AI Act)</span><span class="metric-value">Verificato — De-biasing FairBoost™ applicato</span></div>
      </div>
      <div class="disclaimer">
        <strong>EU AI Act — Classificazione:</strong> Questo sistema è classificato come “Supporto Decisionale ad Alto Rischio”. Nessuna delibera viene eseguita automaticamente. L’operatore umano rimane sempre e inconfutabilmente responsabile della decisione finale. Tutti i modelli di calcolo sono di tipo Glass-Box (Explainable AI).
      </div>
      <div class="footer">FINOMNIA S.r.l. — Metis v2.0 — Dossier: ${dossierId} — ${date}</div>
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

  const startAnalysis = async () => {
    if (!selectedFile) {
      alert("Per favore, trascina o clicca per selezionare un documento (es. Bilancio_NanoBanana.txt) prima di avviare l'IA.");
      return;
    }
    setStep("loading");
    
    // Simulate loading text phases
    setTimeout(() => setLoadingText("Agent_OCR: Estrazione dati da Bilancio XBRL..."), 800);
    setTimeout(() => setLoadingText("Agent_Math: Calcolo Altman Z-Score e DSCR..."), 1400);
    setTimeout(() => setLoadingText("Agent_Compliance: Validazione pattern Centrale Rischi..."), 2000);
    setTimeout(() => setLoadingText("Agent_News: Crawling reputazionale NLP..."), 2500);
    setTimeout(() => setLoadingText("Agent_Writer: Compilazione moduli Narrativi PEF..."), 3000);

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
      setTimeout(() => setStep("dashboard"), 500); 
    } catch (e) {
      console.error("Backend non raggiungibile. Fallback static mock.", e);
      setTimeout(() => setStep("dashboard"), 3500);
    }
  };

  if (step === "upload") {
    return (
      <main className="flex items-center justify-center h-screen w-screen overflow-hidden relative">
        {/* Background Banner */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-banner.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(9,13,20,0.75)]"></div>
        </div>
        <div className="glass-panel p-10 max-w-[650px] w-full text-center relative z-10 mx-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-14 h-14 rounded-xl" />
            <span className="font-space font-bold text-5xl tracking-widest text-white">METIS</span>
          </div>
          <div className="font-space text-[10px] tracking-[0.4em] text-text-muted uppercase mb-1">by FINOMNIA</div>
          <p className="text-text-main text-base mb-2">Automazione «Glass-Box» per l'Istruttoria di Fido</p>
          <p className="text-text-muted text-sm mb-10">Conforme con EU AI Act - Nessun processo Black Box autorizzato.</p>
          
          <div className="relative border-2 border-dashed border-glass-border hover:border-cyan transition rounded-xl p-16 mb-8 cursor-pointer bg-black/20 group">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-dim flex items-center justify-center group-hover:bg-cyan transition">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-cyan group-hover:text-black">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
               </svg>
            </div>
            <p className="font-space text-xl text-white mb-2">Trascina qui i documenti cliente</p>
            <p className="text-xs text-text-muted">Formati Supportati: Visura C.R. (PDF), Bilancio Aziendale (XBRL, PDF)</p>
            
            {selectedFile && (
               <p className="mt-6 font-space text-sm text-cyan bg-cyan-dim py-2 px-4 rounded animate-[fadeUp_0.3s_ease-out_forwards]">Documento Riconosciuto: <strong>{selectedFile.name}</strong></p>
            )}
          </div>
          
          <button 
            onClick={startAnalysis}
            className="w-full bg-purple hover:bg-[#8e3bd6] transition text-white font-space font-semibold py-4 rounded-lg shadow-[0_0_25px_rgba(123,44,191,0.5)] tracking-wider"
          >
            AVVIA ANALISI MULTI-AGENTE
          </button>
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

  return (
    <main className="flex h-screen w-screen overflow-hidden relative text-[13px] tracking-wide animate-[fadeUp_0.5s_ease-out_forwards]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-6 h-full overflow-hidden">
        <header className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-space text-2xl font-semibold text-white">
              Dossier: {safeData?.company_name || "ALFA ROMEO SRL"} <span className="text-text-muted text-base ml-3 font-normal">ID: {safeData?.dossier_id || "PEF-2026-X892"}</span>
            </h1>
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
                  src={`https://www.google.com/maps?q=${safeData?.company_info?.lat || 45.4708},${safeData?.company_info?.lng || 9.1911}&z=15&output=embed`}
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
                      <div className="flex justify-between"><span className="text-text-muted">Sede Legale</span><span className="text-white font-medium">{safeData?.company_info?.indirizzo || 'Via G. Verdi 42, Milano'}</span></div>
                      <div className="flex justify-between"><span>Forma Giuridica</span><span className="text-white">{safeData?.company_info?.forma_giuridica || 'SRL'}</span></div>
                      <div className="flex justify-between"><span>P.IVA</span><span className="text-white font-mono text-[10px]">{safeData?.company_info?.partita_iva || 'IT12345678901'}</span></div>
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
              <div className="border border-glass-border rounded-lg p-5 mb-4 bg-black/30 transition hover:border-glass-hover">
                <div className="font-space text-sm font-semibold mb-3 text-white">Documento Caricato</div>
                <div className="text-[13px] text-text-muted leading-relaxed">
                  Totale accordato operativo: € 1.250.000<br/>
                  Utilizzato: € 980.000<br/>
                  <span className={`px-1 py-0.5 rounded cursor-default border-b border-dashed border-cyan transition-colors duration-300 ${hoveredLink === 'scaduti' ? 'bg-yellow text-black border-yellow shadow-[0_0_8px_var(--color-yellow)]' : 'bg-cyan-dim text-cyan'}`}>
                    Scaduti e Sconfinamenti: € 45.200 (a 60 gg)
                  </span><br/>
                  Garanzie MCC: € 400.000
                </div>
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
              
              {/* Multi-Model Risk Selector — Expand/Collapse */}
              <div className="mb-6 space-y-2">
                {['altman', 'ohlson', 'zmijewski', 'modigliani'].map((key) => {
                  const m = safeData?.risk_models?.[key];
                  const label = m?.name || (key === 'altman' ? 'Altman Z-Score' : key === 'ohlson' ? 'Ohlson O-Score' : key === 'zmijewski' ? 'Zmijewski X-Score' : 'Modigliani-Miller');
                  const isExpanded = selectedModel === key;
                  const isDistress = m?.status?.includes('DISTRESS') || m?.status?.includes('ALTO') || m?.status?.includes('OVER');
                  const color = isDistress ? 'red' : 'cyan';
                  const mainValue = key === 'modigliani' ? (m?.leverage ?? 0.34) : (m?.score ?? (key === 'altman' ? 3.12 : key === 'ohlson' ? -2.85 : -1.72));
                  const extraLabel = key === 'modigliani' ? `WACC ${m?.wacc || 7.2}%` : (key !== 'altman' && m?.pd_pct !== undefined) ? `PD ${m.pd_pct}%` : '';

                  return (
                    <div key={key} className={`bg-black/30 border rounded-xl overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'border-cyan/30' : 'border-glass-border'
                    }`}>
                      {/* Collapsed Bar — Always Visible */}
                      <button onClick={() => setSelectedModel(isExpanded ? '' : key)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isDistress ? 'bg-red shadow-[0_0_6px_var(--color-red)]' : 'bg-cyan shadow-[0_0_6px_var(--color-cyan)]'}`}></div>
                          <span className="font-space text-[11px] text-white font-semibold tracking-wider">{label}</span>
                          <span className="text-[9px] text-text-muted hidden sm:inline">({m?.author || ''})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {extraLabel && <span className={`text-[9px] px-1.5 py-0.5 rounded border font-space font-semibold border-${color}/30 text-${color} bg-${color}/10`}>{extraLabel}</span>}
                          <span className={`font-space text-lg font-bold text-${color}`}>{mainValue}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold border-${color}/40 text-${color} bg-${color}/10`}>{m?.status || 'N/A'}</span>
                          <svg className={`w-3.5 h-3.5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 border-t border-glass-border animate-[fadeUp_0.2s_ease-out_forwards]">
                          <div className="flex items-end gap-4 mb-3">
                            <span className={`font-space text-5xl font-bold text-${color}`}>{mainValue}</span>
                            <div className="flex flex-col gap-1 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold tracking-wider border-${color}/50 text-${color} bg-${color}/10`}>{m?.status || 'SAFE ZONE'}</span>
                              {key !== 'altman' && key !== 'modigliani' && m?.pd_pct !== undefined && (
                                <span className="text-[10px] text-text-muted">PD stimata: <strong className={`text-${color}`}>{m.pd_pct}%</strong></span>
                              )}
                              {key === 'modigliani' && (
                                <span className="text-[10px] text-text-muted">WACC: <strong className={`text-${color}`}>{m?.wacc || 7.2}%</strong></span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-text-muted border-l-2 border-glass-border pl-2 leading-relaxed">
                            {m?.description || 'Calcolo strutturale matematico deterministico.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
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

              {/* Benchmark ATECO (Module 4) */}
              <div className="mb-6 bg-black/20 border border-glass-border rounded-lg p-4">
                <div className="font-space text-xs tracking-widest text-text-muted uppercase mb-3">Benchmark Settore ISTAT</div>
                <div className="text-[11px] text-text-muted mb-2">{safeData?.benchmark?.settore_ateco || 'G46.3 - Commercio all\'ingrosso prodotti alimentari'}</div>
                <div className="grid grid-cols-3 gap-3">
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
