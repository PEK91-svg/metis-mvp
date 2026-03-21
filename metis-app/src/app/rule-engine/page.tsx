"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import Sidebar from "@/components/Sidebar";

export default function RuleEngine() {
  const [activeTab, setActiveTab] = useState('editor');
  const [simRunning, setSimRunning] = useState(false);
  const [championStats, setChampionStats] = useState({ approval: 65, defaultRate: 3.2, biasScore: 45 });
  const [challengerStats, setChallengerStats] = useState({ approval: 65, defaultRate: 3.2, biasScore: 45 });

  // Simulate Challenger Data
  useEffect(() => {
    if (simRunning) {
      const interval = setInterval(() => {
        setChallengerStats(prev => ({
          approval: Math.min(82, prev.approval + 1.5),
          defaultRate: Math.max(2.1, prev.defaultRate - 0.1),
          biasScore: Math.min(96, prev.biasScore + 3)
        }));
      }, 150);
      setTimeout(() => {
        clearInterval(interval);
        setSimRunning(false);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [simRunning]);

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,229,255,0.08),_transparent_40%),radial-gradient(circle_at_80%_80%,_rgba(123,44,191,0.08),_transparent_40%)] pointer-events-none"></div>
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
          <div>
            <h1 className="font-space text-lg text-white font-semibold">Visual Policy Editor</h1>
            <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
              <span className="text-purple uppercase">Strategy: SME Lending v2.4</span>
              <span className="text-white/30">•</span>
              <span className="text-cyan px-2 py-[1px] rounded bg-cyan/10 border border-cyan/30 text-[9px] uppercase font-bold">Draft / Challenger Mode</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="text-white/60 hover:text-white text-xs font-space border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition bg-white/5">
                Saved Versions
             </button>
             <button 
                onClick={() => setSimRunning(true)}
                className="bg-purple text-white hover:bg-purple/80 hover:shadow-[0_0_20px_rgba(123,44,191,0.5)] transition text-xs font-space font-semibold px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(123,44,191,0.3)] border border-purple/50 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                RUN SIMULATION vs CHAMPION
             </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex relative">
          
          {/* Graph Editor Area */}
          <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]">
             
             {/* Node 1: Start */}
             <div className="absolute top-[80px] left-[100px] w-[220px] bg-black/60 backdrop-blur-xl border-l-[3px] border-l-cyan border border-white/10 rounded-lg p-3 shadow-xl">
                <div className="flex justify-between items-center mb-2">
                   <div className="font-space font-bold uppercase text-[10px] tracking-widest text-[#00E5FF]">Data Ingestion</div>
                   <div className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_var(--color-cyan)] animate-pulse"></div>
                </div>
                <div className="text-text-muted text-[11px]">C.R. Bankitalia, Bilancio XBRL, Cerved APIs.</div>
                {/* Connector dot */}
                <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-cyan rounded-full shadow-[0_0_10px_var(--color-cyan)] pointer-events-none"></div>
             </div>

             {/* SVG Line 1 -> 2 */}
             <svg className="absolute top-[110px] left-[320px] w-[80px] h-[50px] overflow-visible z-0">
               <path d="M 0 0 C 40 0, 40 40, 80 40" fill="transparent" stroke="rgba(0,229,255,0.4)" strokeWidth="2" strokeDasharray="4 4">
                 <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
               </path>
             </svg>

             {/* Node 2: Fraud Detect */}
             <div className="absolute top-[120px] left-[400px] w-[240px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-4 shadow-xl z-10 transition-transform hover:-translate-y-1 hover:border-yellow/50">
                {/* Connector dots */}
                <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-cyan/50 rounded-full border border-cyan"></div>
                <div className="absolute top-1/2 -right-1.5 w-3 h-3 bg-yellow rounded-full shadow-[0_0_10px_var(--color-yellow)]"></div>
                
                <div className="flex gap-3">
                   <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center border border-yellow/30 text-yellow">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                   </div>
                   <div>
                     <div className="font-space font-bold uppercase text-[11px] tracking-widest text-white mb-0.5">Zest Protect™ Fraud</div>
                     <div className="text-text-muted text-[10px]">ML Anomaly Detection su OCR.</div>
                   </div>
                </div>
                <div className="mt-3 bg-white/5 border border-white/10 rounded p-2 text-[9px] text-white flex justify-between">
                   <span>Soglia Blocco (False Positive &lt; 2%)</span>
                   <span className="font-mono text-yellow font-bold">1.4% P.A.</span>
                </div>
             </div>

             {/* SVG Line 2 -> 3 */}
             <svg className="absolute top-[160px] left-[640px] w-[100px] h-[50px] overflow-visible z-0">
               <path d="M 0 0 C 50 0, 50 40, 100 40" fill="transparent" stroke="rgba(250,204,21,0.4)" strokeWidth="2" strokeDasharray="4 4">
                 <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
               </path>
             </svg>

             {/* Node 3: AI Scoring */}
             <div className="absolute top-[170px] left-[740px] w-[260px] bg-[rgba(123,44,191,0.15)] backdrop-blur-xl border border-purple/40 rounded-lg p-4 shadow-[0_0_30px_rgba(123,44,191,0.15)] z-10 box-border">
                <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-yellow/50 rounded-full border border-yellow"></div>
                <div className="absolute top-1/4 -right-1.5 w-3 h-3 bg-green rounded-full shadow-[0_0_10px_var(--color-green)]"></div>
                <div className="absolute top-3/4 -right-1.5 w-3 h-3 bg-red rounded-full shadow-[0_0_10px_var(--color-red)]"></div>
                
                <div className="flex gap-3 mb-3">
                   <div className="w-10 h-10 rounded-lg bg-purple/20 flex items-center justify-center border border-purple/50 text-purple shadow-[0_0_15px_rgba(123,44,191,0.3)]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                   </div>
                   <div>
                     <div className="font-space font-bold uppercase text-[12px] tracking-widest text-white mb-0.5">Metis AI Scoring</div>
                     <div className="text-purple/80 text-[10px] uppercase font-bold tracking-widest">FairBoost Enabled</div>
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="bg-black/40 border border-white/5 rounded px-2 py-1.5 flex justify-between">
                     <span className="text-white text-[10px]">Weight: Bilancio XBRL</span>
                     <span className="text-cyan font-mono text-[10px]">40%</span>
                   </div>
                   <div className="bg-black/40 border border-white/5 rounded px-2 py-1.5 flex justify-between">
                     <span className="text-white text-[10px]">Weight: Centrale Rischi</span>
                     <span className="text-cyan font-mono text-[10px]">50%</span>
                   </div>
                   <div className="bg-black/40 border border-white/5 rounded px-2 py-1.5 flex justify-between">
                     <span className="text-white text-[10px]">Weight: Web NLP (Nowcasting)</span>
                     <span className="text-cyan font-mono text-[10px]">10%</span>
                   </div>
                </div>
                {/* Visual Condition node UI */}
                <div className="mt-4 flex gap-2">
                   <div className="flex-1 bg-green/10 border border-green/30 rounded py-1 text-center text-[9px] text-green font-space uppercase">Score &gt; 65</div>
                   <div className="flex-1 bg-red/10 border border-red/30 rounded py-1 text-center text-[9px] text-red font-space uppercase">Score &lt; 65</div>
                </div>
             </div>

             {/* UI Controls - Bottom center float */}
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-black/80 backdrop-blur border border-white/10 rounded-full p-1.5 shadow-2xl">
               <button className="px-4 py-2 text-white/50 hover:text-white transition font-space text-[10px] uppercase tracking-widest rounded-full hover:bg-white/5">Nodes</button>
               <button className="px-4 py-2 text-white/50 hover:text-white transition font-space text-[10px] uppercase tracking-widest rounded-full hover:bg-white/5">Rules</button>
               <div className="w-[1px] h-4 bg-white/20 mx-2"></div>
               <button className="px-4 py-2 bg-cyan/10 text-cyan border border-cyan/30 transition font-space text-[10px] font-bold uppercase tracking-widest rounded-full shadow-[0_0_10px_rgba(0,229,255,0.2)]">+ Add Step</button>
             </div>

          </div>

          {/* Live Simulator Results Panel */}
          <div className="w-[380px] border-l border-white/10 bg-[rgba(14,21,33,0.95)] backdrop-blur-2xl flex flex-col z-20">
             <div className="p-5 border-b border-white/10 bg-black/20">
                <h2 className="font-space text-sm font-semibold tracking-widest text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green animate-pulse shadow-[0_0_8px_var(--color-green)]"></div>
                  WHAT-IF SIMULATOR
                </h2>
                <p className="text-[11px] text-text-muted mt-1">Comparativa su dataset storico 2024-2025.</p>
             </div>

             <div className="p-5 flex-1 overflow-y-auto space-y-6">
                
                {/* Approval Rate Card */}
                <div className="border border-white/10 rounded-xl p-4 bg-white/5 relative overflow-hidden group hover:border-cyan/50 transition">
                  {simRunning && <div className="absolute inset-0 bg-cyan/5 animate-pulse"></div>}
                  <div className="text-[10px] text-text-muted font-space tracking-widest uppercase mb-4 relative z-10">Approval Rate</div>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <div className="text-[10px] text-white/40 mb-1">Champion</div>
                      <div className="font-space text-xl text-white/70">{championStats.approval.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-cyan mb-1 flex justify-end">Challenger</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${challengerStats.approval > championStats.approval ? 'bg-green/20 text-green border border-green/30' : ''}`}>
                          +{ (challengerStats.approval - championStats.approval).toFixed(1) }%
                        </span>
                        <div className="font-space text-3xl font-bold text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                          {challengerStats.approval.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default Rate Expected Card */}
                <div className="border border-white/10 rounded-xl p-4 bg-white/5 relative overflow-hidden group hover:border-purple/50 transition">
                  {simRunning && <div className="absolute inset-0 bg-purple/5 animate-pulse"></div>}
                  <div className="text-[10px] text-text-muted font-space tracking-widest uppercase mb-4 relative z-10">Expected Default Rate</div>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <div className="text-[10px] text-white/40 mb-1">Champion</div>
                      <div className="font-space text-xl text-white/70">{championStats.defaultRate.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-purple mb-1 flex justify-end">Challenger</div>
                      <div className="flex items-center gap-2">
                         <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold bg-green/20 text-green border border-green/30`}>
                          { (challengerStats.defaultRate - championStats.defaultRate).toFixed(2) }%
                        </span>
                        <div className="font-space text-3xl font-bold text-purple drop-shadow-[0_0_8px_rgba(123,44,191,0.5)]">
                          {challengerStats.defaultRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fair Lending Bias Score */}
                <div className="border border-white/10 rounded-xl p-4 bg-white/5 relative">
                   <div className="flex justify-between items-center mb-4">
                     <div className="text-[10px] text-text-muted font-space tracking-widest uppercase">Fair LENDING Score</div>
                     <span className="text-[8px] bg-cyan/10 border border-cyan/30 text-cyan px-2 py-0.5 rounded-full uppercase tracking-wider">EU AI Act</span>
                   </div>
                   
                   <div className="mb-2 flex justify-between font-space text-[11px]">
                     <span className="text-white/50">Champion: {championStats.biasScore}/100</span>
                     <span className="text-cyan font-bold">Challenger: {challengerStats.biasScore}/100</span>
                   </div>

                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                     <div className="absolute top-0 left-0 bottom-0 bg-white/30" style={{ width: `${championStats.biasScore}%` }}></div>
                     <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan to-[rgba(123,44,191,1)] transition-all duration-300" style={{ width: `${challengerStats.biasScore}%` }}></div>
                   </div>
                   <p className="mt-3 text-[10px] text-text-muted leading-relaxed border-l border-cyan/50 pl-2">
                     Il Challenger riduce la disparità di scarto del 38% applicando il de-biasing <strong className="text-white">FairBoost™</strong> su 5 features socio-demografiche nascoste.
                   </p>
                </div>

             </div>

             <div className="p-5 border-t border-white/10 bg-black/40">
                <button className={`w-full py-3 rounded-lg font-space font-bold uppercase tracking-widest transition-all shadow-xl
                   ${challengerStats.approval > 80 
                      ? 'bg-gradient-to-r from-green to-[rgba(0,255,102,0.6)] text-black shadow-[0_0_20px_rgba(0,255,102,0.4)]' 
                      : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'}`}>
                  Deploy to Production
                </button>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
