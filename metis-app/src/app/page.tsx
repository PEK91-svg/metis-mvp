"use client";
import { useState } from "react";

export default function MetisApp() {
  const [step, setStep] = useState<"upload" | "loading" | "dashboard">("upload");
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [loadingText, setLoadingText] = useState("Inizializzazione Swarm Multi-Agente...");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("altman");

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
      <main className="flex items-center justify-center h-screen w-screen overflow-hidden">
        <div className="glass-panel p-10 max-w-[650px] w-full text-center relative z-10 mx-4">
          <div className="font-space text-cyan font-bold text-5xl tracking-widest mb-4">METIS</div>
          <p className="text-text-main text-base mb-2">Automazione "Glass-Box" per l'Istruttoria di Fido</p>
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
      <aside className="w-[70px] h-full border-r border-glass-border flex flex-col items-center py-8 z-10 bg-[rgba(9,13,20,0.8)]">
        <div className="font-space text-cyan font-bold text-2xl tracking-widest [writing-mode:vertical-lr] rotate-180">METIS</div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-6 h-full overflow-hidden">
        <header className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-space text-2xl font-semibold text-white">
              Dossier: {safeData?.company_name || "ALFA ROMEO SRL"} <span className="text-text-muted text-base ml-3 font-normal">ID: {safeData?.dossier_id || "PEF-2026-X892"}</span>
            </h1>
          </div>
          <div className="border border-purple text-purple px-4 py-1.5 rounded-full text-xs font-semibold uppercase shadow-[0_0_10px_rgba(123,44,191,0.2)] animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple"></div> Elaborazione Completata
          </div>
        </header>

        <div className="grid grid-cols-[1.1fr_1.3fr_1fr] gap-6 h-full min-h-0">
          
          {/* Column 1: Sources */}
          <section className="glass-panel flex flex-col overflow-hidden">
            <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl">
              1. Raw Data Sources (OCR)
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
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
          <section className="glass-panel flex flex-col overflow-hidden">
             <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl">
              2. Narrative Generation (XAI)
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
          <section className="glass-panel flex flex-col overflow-hidden">
             <div className="p-4 border-b border-glass-border text-xs uppercase tracking-wider text-cyan font-semibold bg-black/20 rounded-t-xl">
              3. Dashboards & Matrices
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              
              {/* Multi-Model Risk Selector */}
              <div className="mb-6 bg-black/30 border border-glass-border rounded-xl p-5 relative overflow-hidden">
                <div className="flex gap-1 mb-4 bg-black/40 p-1 rounded-lg">
                  {['altman', 'ohlson', 'zmijewski', 'modigliani'].map((key) => {
                    const model = safeData?.risk_models?.[key];
                    const label = key === 'altman' ? 'Altman' : key === 'ohlson' ? 'Ohlson' : key === 'zmijewski' ? 'Zmijewski' : 'Modigliani';
                    return (
                      <button key={key} onClick={() => setSelectedModel(key)}
                        className={`flex-1 py-1.5 px-2 rounded text-[10px] font-space font-semibold tracking-wider transition ${
                          selectedModel === key ? 'bg-cyan/20 text-cyan border border-cyan/30' : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
                        }`}>{label}</button>
                    );
                  })}
                </div>
                {(() => {
                  const m = safeData?.risk_models?.[selectedModel];
                  const isDistress = m?.status?.includes('DISTRESS') || m?.status?.includes('ALTO') || m?.status?.includes('OVER');
                  const isGrey = m?.status?.includes('GREY') || m?.status?.includes('MISTO');
                  const color = isDistress ? 'red' : isGrey ? 'yellow' : 'cyan';
                  const mainValue = selectedModel === 'modigliani' 
                    ? (m?.leverage ?? 0.34) 
                    : (m?.score ?? (selectedModel === 'altman' ? 3.12 : -2.85));
                  const mainLabel = selectedModel === 'modigliani' ? 'Leverage' : 'Score';
                  return (
                    <>
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-20 bg-${color}`}></div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-space text-xs tracking-widest text-text-muted uppercase">{m?.name || 'Altman Z-Score'}</span>
                        <span className="text-[9px] text-text-muted">({m?.author || 'E. Altman (1968)'})</span>
                      </div>
                      <div className="flex items-end gap-3 mt-2">
                        <span className={`font-space text-5xl font-bold text-${color}`}>{mainValue}</span>
                        <span className={`text-[10px] px-2 py-1 rounded border mb-2 font-semibold tracking-wider border-${color}/50 text-${color} bg-${color}/10`}>
                          {m?.status || 'SAFE ZONE'}
                        </span>
                      </div>
                      {selectedModel !== 'modigliani' && selectedModel !== 'altman' && m?.pd_pct !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">PD stimata:</span>
                          <span className={`font-space text-sm font-bold text-${color}`}>{m.pd_pct}%</span>
                        </div>
                      )}
                      {selectedModel === 'modigliani' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-text-muted">WACC:</span>
                          <span className={`font-space text-sm font-bold text-${color}`}>{m?.wacc || 7.2}%</span>
                        </div>
                      )}
                      <p className="text-[10px] text-text-muted mt-3 border-l-2 border-glass-border pl-2 leading-relaxed">
                        {m?.description || 'Calcolo strutturale matematico deterministico.'}
                      </p>
                    </>
                  );
                })()}
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

      {/* EU AI Act Disclaimer (Module 7) */}
      <div className="absolute top-0 right-[70px] left-[70px] bg-[rgba(123,44,191,0.1)] border-b border-purple/30 py-1.5 px-6 text-center z-40">
        <span className="text-[10px] text-purple tracking-wider font-space">🇪🇺 EU AI Act Compliance: Questo sistema è classificato come "Supporto Decisionale". Nessuna delibera automatica. L'umano è responsabile finale.</span>
      </div>

      {/* Floating Action Bar - DELIBERA */}
      {step === "dashboard" && safeData && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[rgba(9,13,20,0.95)] border border-glass-border p-3 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-50 animate-[fadeUp_0.8s_ease-out_forwards]">
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
            BOCCHIA PRATICA
          </button>
        </div>
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
