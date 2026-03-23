"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, Check, Activity, BarChart3, Fingerprint } from "lucide-react";

export default function AnalisiBilancioPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch from the generated JSON
    fetch("/alpha_bilancio.json")
      .then(res => res.json())
      .then(json => {
        setTimeout(() => {
          setData(json);
          setLoading(false);
        }, 1500); // simulate analysis delay
      });
  }, []);

  const handleApprove = () => {
    // Trigger global state update (simulated via localStorage or session)
    if (typeof window !== "undefined" && data) {
      // We will read this in the Dashboard to update KPIs
      sessionStorage.setItem("metis_new_analysis", JSON.stringify(data));
      router.push("/home");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen w-screen bg-[#090D14] flex-col items-center justify-center font-space relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.1),_transparent_50%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin mb-8" />
          <h2 className="text-2xl text-white tracking-widest uppercase animate-pulse">Ricostruzione Bilancio in corso...</h2>
          <p className="text-cyan/60 text-sm mt-4 font-inter text-center max-w-md">L'Agente OCR sta estraendo i dati. Il modello del rischio sta calcolando gli indicatori prospettici.</p>
        </div>
      </div>
    );
  }

  const { soggetto, bilancio_t0, bilancio_t1, score_in_analisi } = data;

  return (
    <div className="flex h-screen w-screen bg-[#090D14] overflow-hidden text-[#F1F5F9] font-inter">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
        {/* Header */}
        <header className="sticky top-0 z-50 px-8 py-6 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push("/home")}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition text-white/60 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-space font-bold uppercase tracking-widest text-white">{soggetto.ragione_sociale}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-space tracking-widest bg-yellow/10 text-yellow border border-yellow/30 uppercase">In Analisi</span>
              </div>
              <p className="text-xs text-white/50 font-space tracking-widest mt-1">
                PIVA: {soggetto.partita_iva} • Settore: {soggetto.settore} • {soggetto.area_geografica}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-space text-xs uppercase tracking-widest transition">
              Rifiuta Pratica
            </button>
            <button 
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-blue-500 text-black font-space font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition flex items-center gap-2"
            >
              <Check size={16} /> Approva e Salva
            </button>
          </div>
        </header>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonna Sinistra: Ricostruzione Bilancio (2 colonne) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0A0F14] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-space font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <FileText className="text-cyan" size={20} /> Conto Economico Ricostruito
                </h3>
                <span className="text-[10px] text-cyan bg-cyan/10 px-3 py-1 rounded-full border border-cyan/20">OCR Confidence: 99.8%</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 font-space text-[10px] uppercase tracking-widest">
                      <th className="text-left pb-3 font-normal">Voce</th>
                      <th className="text-right pb-3 font-normal text-white">2024 (T0)</th>
                      <th className="text-right pb-3 font-normal">2023 (T1)</th>
                      <th className="text-right pb-3 font-normal">Var %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { label: "Ricavi delle Vendite", t0: bilancio_t0.ricavi, t1: bilancio_t1.ricavi, isBold: true },
                      { label: "Costi Operativi", t0: bilancio_t0.costi_operativi, t1: bilancio_t1.costi_operativi },
                      { label: "EBITDA", t0: bilancio_t0.ebitda, t1: bilancio_t1.ebitda, isBold: true, isCyan: true },
                      { label: "Ammortamenti", t0: bilancio_t0.ammortamenti, t1: bilancio_t1.ammortamenti },
                      { label: "Oneri Finanziari", t0: bilancio_t0.oneri_finanziari, t1: bilancio_t1.oneri_finanziari },
                      { label: "Imposte", t0: bilancio_t0.imposte, t1: bilancio_t1.imposte },
                      { label: "Utile Netto", t0: bilancio_t0.utile_netto, t1: bilancio_t1.utile_netto, isBold: true },
                    ].map((row, i) => {
                      const diff = ((row.t0 - row.t1) / row.t1) * 100;
                      return (
                        <tr key={i} className={`hover:bg-white/5 transition-colors ${row.isBold ? 'font-semibold' : 'text-white/70'}`}>
                          <td className="py-4 font-space">{row.label}</td>
                          <td className={`text-right py-4 font-space ${row.isCyan ? 'text-cyan drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]' : 'text-white'}`}>{formatCurrency(row.t0)}</td>
                          <td className="text-right py-4 font-space">{formatCurrency(row.t1)}</td>
                          <td className={`text-right py-4 font-space ${diff > 0 ? 'text-green' : 'text-red'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#0A0F14] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-purple/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="text-purple" size={20} />
                <h3 className="text-lg font-space font-bold text-white uppercase tracking-widest">Stato Patrimoniale</h3>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-space text-white/50 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Attività</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm"><span className="text-cyan/80 font-space relative before:absolute before:-left-3 before:top-2 before:w-1.5 before:h-1.5 before:bg-cyan before:rounded-full">Attivo Corrente</span> <span className="text-white font-space font-semibold">{formatCurrency(bilancio_t0.attivo_corrente)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70 font-space ml-2">Crediti Comm.</span> <span className="text-white/70 font-space">{formatCurrency(bilancio_t0.crediti_commerciali)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70 font-space ml-2">Disponibilità Liq.</span> <span className="text-white/70 font-space">{formatCurrency(bilancio_t0.disponibilita_liquide)}</span></div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between text-sm"><span className="text-white font-space font-bold">Totale Attivo</span> <span className="text-white font-space font-bold">{formatCurrency(bilancio_t0.attivo_totale)}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-space text-white/50 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Passività e Netto</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm"><span className="text-purple-400 font-space relative before:absolute before:-left-3 before:top-2 before:w-1.5 before:h-1.5 before:bg-purple border-white/10 before:rounded-full">Patrimonio Netto</span> <span className="text-white font-space font-semibold">{formatCurrency(bilancio_t0.patrimonio_netto)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-red-400 font-space relative before:absolute before:-left-3 before:top-2 before:w-1.5 before:h-1.5 before:bg-red-500 before:rounded-full">Debiti Fin. (MLT)</span> <span className="text-white font-space font-semibold">{formatCurrency(bilancio_t0.debiti_finanziari_mlt)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-white/70 font-space ml-2">Passivo Corrente</span> <span className="text-white/70 font-space">{formatCurrency(bilancio_t0.passivo_corrente)}</span></div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between text-sm"><span className="text-white font-space font-bold">Totale Pass + Netto</span> <span className="text-white font-space font-bold">{formatCurrency(bilancio_t0.attivo_totale)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra: Metis AI Analysis */}
          <div className="space-y-8">
            <div className="bg-[#0A0F14] border border-cyan/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,229,255,0.05)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.4)] border border-cyan/40">
                  <img src="/ai_widget_icon.png" alt="Metis" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-space font-bold text-white uppercase tracking-widest">METIS Intelligence</h3>
                  <p className="text-[9px] text-cyan font-space tracking-widest uppercase">Agentic Risk Analysis Complete</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-space text-white/50 uppercase tracking-widest mb-2">Probabilità di Default (PD)</h4>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-space font-black text-green drop-shadow-[0_0_15px_rgba(0,255,102,0.4)]">{score_in_analisi.pd_stimata.toFixed(1)}%</span>
                    <span className="text-sm text-green/60 font-space mb-1 border border-green/20 bg-green/10 px-2 py-0.5 rounded-md">Ottimo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                    <span className="text-[9px] font-space text-white/40 uppercase tracking-widest block mb-1">Altman Z' Score</span>
                    <span className="text-xl font-space text-white font-bold">{score_in_analisi.altman_z_stimato.toFixed(2)}</span>
                    <p className="text-[10px] text-green mt-1 font-inter">Safe Zone</p>
                  </div>
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                    <span className="text-[9px] font-space text-white/40 uppercase tracking-widest block mb-1">DSCR</span>
                    <span className="text-xl font-space text-white font-bold">{score_in_analisi.dscr_stimato.toFixed(2)}x</span>
                    <p className="text-[10px] text-green mt-1 font-inter">Copertura Ampia</p>
                  </div>
                </div>

                <div className="bg-cyan/5 border border-cyan/20 rounded-xl p-5 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan/10 blur-[20px] rounded-full" />
                  <h4 className="flex items-center gap-2 text-xs font-space text-cyan uppercase tracking-widest mb-3">
                    <CheckCircle2 size={16} /> Insight Strategico
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed font-inter">
                    I ricavi mostrano una crescita dell'8.5% YoY con forte miglioramento dell'EBITDA margin (dal 14.7% al 16.8%). Elevata liquidità a breve. Struttura finanziaria solida per sostenere un eventuale ammortamento a MT.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#0A0F14] border border-white/10 rounded-2xl p-6 relative">
              <h3 className="text-sm font-space font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow" size={16} /> EBA Compliance
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-green shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs text-white font-medium">Nessun evento restrittivo (LOM)</p>
                    <p className="text-[10px] text-white/40 mt-1">Nessun ritardo pagamenti \> 90gg</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-green shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs text-white font-medium">Adeguatezza Flussi Cassa</p>
                    <p className="text-[10px] text-white/40 mt-1">Previsioni a 12 mesi favorevoli (FCF \> 0)</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
