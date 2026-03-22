"use client";
// ─── Centrale Rischi Adapter — Banca d'Italia CR Integration ─────────────────
// UI adapter panel per la Centrale Rischi. Mostra lo stato della connessione,
// i dati CR disponibili e la roadmap verso l'integrazione live.
// Architettura: Adapter Pattern — pronto per sostituire il mock con feed reale.

import { useState } from "react";

export interface CRLineData {
  tipo: string;
  istituto: string;
  accordato: number;
  utilizzato: number;
  scaduti: number;
  giorni_scaduto: number;
  garanzie: number;
  stato: 'REGOLARE' | 'SCADUTO' | 'RISTRUTTURATO' | 'SOFFERENZA';
}

export interface CRAdapterData {
  connectionStatus: 'LIVE' | 'ADAPTER_MOCK' | 'ERROR';
  lastSync: string;         // ISO timestamp
  partitaIva: string;
  totalAccordato: number;
  totalUtilizzato: number;
  totalScaduti: number;
  utilizzoPercent: number;
  trend12m: number[];
  trend12mMesi: string[];
  trendStatus: 'STABILE' | 'MIGLIORAMENTO' | 'DETERIORAMENTO';
  linee: CRLineData[];
  anomalie: string[];
}

// ── Mock data generator (to be replaced by real adapter) ──────────────────────
export function buildCRAdapterData(piva: string, apiData?: any): CRAdapterData {
  // Use real API data if available, otherwise use realistic mock
  const crRaw = apiData?.cr_raw;

  return {
    connectionStatus: crRaw ? 'LIVE' : 'ADAPTER_MOCK',
    lastSync: new Date().toISOString(),
    partitaIva: piva,
    totalAccordato: crRaw?.accordato || 1_250_000,
    totalUtilizzato: crRaw?.utilizzato || 980_000,
    totalScaduti: crRaw?.scaduti || 45_200,
    utilizzoPercent: crRaw ? Math.round((crRaw.utilizzato / crRaw.accordato) * 100) : 78,
    trend12m: crRaw?.trend || [72, 74, 78, 76, 80, 82, 85, 83, 88, 90, 86, 78],
    trend12mMesi: ['M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D', 'G', 'F'],
    trendStatus: crRaw?.trend_status || 'DETERIORAMENTO',
    linee: crRaw?.linee || [
      { tipo: 'Autoliquidante',       istituto: 'Banca A', accordato: 600_000, utilizzato: 510_000, scaduti: 45_200, giorni_scaduto: 62, garanzie: 0,       stato: 'SCADUTO'   },
      { tipo: 'A Scadenza',           istituto: 'Banca A', accordato: 400_000, utilizzato: 320_000, scaduti: 0,      giorni_scaduto: 0,  garanzie: 400_000, stato: 'REGOLARE'  },
      { tipo: 'A Revoca (Conto)',     istituto: 'Banca B', accordato: 150_000, utilizzato: 92_000,  scaduti: 0,      giorni_scaduto: 0,  garanzie: 0,       stato: 'REGOLARE'  },
      { tipo: 'Mutuo Ipotecario',     istituto: 'Banca C', accordato: 100_000, utilizzato: 58_000,  scaduti: 0,      giorni_scaduto: 0,  garanzie: 180_000, stato: 'REGOLARE'  },
    ],
    anomalie: crRaw?.anomalie || [
      'Scaduti persistenti su linea autoliquidante > 60 giorni',
      'Utilizzo medio 12M in crescita (+8 p.p. anno su anno)',
    ],
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionBadge({ status }: { status: CRAdapterData['connectionStatus'] }) {
  if (status === 'LIVE') return (
    <span className="flex items-center gap-1.5 text-[9px] text-green bg-green/10 border border-green/30 px-2 py-0.5 rounded font-space font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></span>LIVE — Banca d&apos;Italia CR
    </span>
  );
  if (status === 'ERROR') return (
    <span className="flex items-center gap-1.5 text-[9px] text-red bg-red/10 border border-red/30 px-2 py-0.5 rounded font-space font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-red"></span>ERRORE CONNESSIONE
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[9px] text-yellow bg-yellow/10 border border-yellow/30 px-2 py-0.5 rounded font-space font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow"></span>ADAPTER MOCK
    </span>
  );
}

function LineRow({ line }: { line: CRLineData }) {
  const utilizzo = Math.round((line.utilizzato / Math.max(line.accordato, 1)) * 100);
  const stateColor = line.stato === 'REGOLARE' ? 'text-green border-green/30 bg-green/5'
    : line.stato === 'SCADUTO' ? 'text-red border-red/30 bg-red/5'
    : line.stato === 'SOFFERENZA' ? 'text-red border-red/50 bg-red/10'
    : 'text-yellow border-yellow/30 bg-yellow/5';

  return (
    <div className="border border-glass-border rounded-lg p-3 bg-black/20 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-white font-medium">{line.tipo}</div>
          <div className="text-[9px] text-text-muted">{line.istituto}</div>
        </div>
        <span className={`text-[8px] px-2 py-0.5 rounded border font-space font-semibold ${stateColor}`}>
          {line.stato}
        </span>
      </div>
      {/* Utilization bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[9px] text-text-muted">
          <span>Utilizzo {utilizzo}%</span>
          <span>€{(line.utilizzato / 1000).toFixed(0)}K / €{(line.accordato / 1000).toFixed(0)}K</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${utilizzo > 90 ? 'bg-red' : utilizzo > 80 ? 'bg-yellow' : 'bg-cyan'}`}
            style={{ width: `${Math.min(utilizzo, 100)}%` }}
          ></div>
        </div>
      </div>
      {line.scaduti > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-red">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Scaduti €{(line.scaduti / 1000).toFixed(1)}K a {line.giorni_scaduto} gg
          {line.garanzie > 0 && <span className="text-text-muted ml-2">Garanzie €{(line.garanzie / 1000).toFixed(0)}K</span>}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CentraleRischiAdapter({ data }: { data: CRAdapterData }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'linee' | 'roadmap'>('overview');
  const syncTime = new Date(data.lastSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-space text-[10px] text-text-muted uppercase tracking-widest">Centrale Rischi — Banca d&apos;Italia</div>
          <div className="text-[9px] text-text-muted">P.IVA: {data.partitaIva} · Aggiornato: {syncTime}</div>
        </div>
        <ConnectionBadge status={data.connectionStatus} />
      </div>

      {/* Adapter mock banner */}
      {data.connectionStatus === 'ADAPTER_MOCK' && (
        <div className="flex items-start gap-2 bg-yellow/5 border border-yellow/20 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-yellow shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-yellow/80 leading-snug">
            Modalità Adapter Mock. I dati riflettono la struttura dell&apos;API Banca d&apos;Italia
            ma usano valori simulativi. Vedere tab Roadmap per il piano di integrazione live.
          </span>
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center bg-black/20 border border-glass-border rounded-lg py-2">
          <div className="font-space text-base font-bold text-white">€{(data.totalAccordato / 1000).toFixed(0)}K</div>
          <div className="text-[8px] text-text-muted uppercase">Accordato</div>
        </div>
        <div className="text-center bg-black/20 border border-glass-border rounded-lg py-2">
          <div className={`font-space text-base font-bold ${data.utilizzoPercent > 90 ? 'text-red' : data.utilizzoPercent > 80 ? 'text-yellow' : 'text-cyan'}`}>
            {data.utilizzoPercent}%
          </div>
          <div className="text-[8px] text-text-muted uppercase">Utilizzo</div>
        </div>
        <div className="text-center bg-black/20 border border-glass-border rounded-lg py-2">
          <div className={`font-space text-base font-bold ${data.totalScaduti > 0 ? 'text-red' : 'text-green'}`}>
            {data.totalScaduti > 0 ? `€${(data.totalScaduti / 1000).toFixed(1)}K` : '€ 0'}
          </div>
          <div className="text-[8px] text-text-muted uppercase">Scaduti</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/30 p-0.5 rounded-lg">
        {(['overview', 'linee', 'roadmap'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 rounded text-[9px] font-space font-semibold tracking-wider transition uppercase ${
              activeTab === t ? 'bg-cyan/20 text-cyan' : 'text-text-muted hover:text-white'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'linee' ? 'Linee' : 'Roadmap'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-2 animate-[fadeUp_0.2s_ease-out_forwards]">
          {/* Trend sparkline */}
          <div className="bg-black/20 border border-glass-border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-text-muted font-space uppercase tracking-wider">Utilizzo % — 12 Mesi</div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-space font-semibold ${
                data.trendStatus === 'DETERIORAMENTO' ? 'border-red/40 text-red bg-red/10' :
                data.trendStatus === 'MIGLIORAMENTO' ? 'border-green/40 text-green bg-green/10' :
                'border-cyan/40 text-cyan bg-cyan/10'
              }`}>{data.trendStatus}</span>
            </div>
            <div className="flex items-end gap-[3px] h-12">
              {data.trend12m.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-t transition-all ${v > 90 ? 'bg-red' : v > 80 ? 'bg-yellow' : 'bg-cyan/70'}`}
                    style={{ height: `${v * 0.44}px` }}
                  ></div>
                  <span className="text-[7px] text-text-muted">{data.trend12mMesi[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalie */}
          {data.anomalie.length > 0 && (
            <div className="space-y-1">
              {data.anomalie.map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-red/5 border border-red/20 rounded px-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red shrink-0 animate-pulse"></div>
                  <span className="text-[10px] text-red/90">{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'linee' && (
        <div className="space-y-2 animate-[fadeUp_0.2s_ease-out_forwards]">
          {data.linee.map((line, i) => (
            <LineRow key={i} line={line} />
          ))}
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="space-y-2 animate-[fadeUp_0.2s_ease-out_forwards]">
          <div className="text-[10px] text-text-muted mb-2">
            Piano di integrazione verso la Centrale Rischi Banca d&apos;Italia (feed XML Portale CR):
          </div>
          {[
            { fase: '01', titolo: 'Configurazione credenziali XML',   desc: 'Registrazione servizi Banca d\'Italia, certificati SSL, setup agent CR.',                     status: 'IN PROGRESSO', color: 'text-yellow' },
            { fase: '02', titolo: 'Parser XML CR Banca d\'Italia',    desc: 'Mapping schema XML Banca d\'Italia → struttura CRAdapterData interna.',                        status: 'DA FARE',      color: 'text-text-muted' },
            { fase: '03', titolo: 'Normalizzazione classificazioni',  desc: 'Mapping codici stato CR (A, B, C, D, E) → stati interni (REGOLARE/SCADUTO/SOFFERENZA).',       status: 'DA FARE',      color: 'text-text-muted' },
            { fase: '04', titolo: 'Sincronizzazione periodica',       desc: 'Cron job mensile per aggiornamento automatico dei dati CR per ogni pratica attiva.',            status: 'DA FARE',      color: 'text-text-muted' },
            { fase: '05', titolo: 'Switch ADAPTER_MOCK → LIVE',       desc: 'Test end-to-end con dati reali, validazione con analisti. Go-live produzione.',                 status: 'DA FARE',      color: 'text-text-muted' },
          ].map(step => (
            <div key={step.fase} className="flex items-start gap-3 border border-glass-border rounded-lg p-3 bg-black/20">
              <div className="text-[9px] font-space font-bold text-text-muted bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                {step.fase}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white font-medium">{step.titolo}</div>
                <div className="text-[9px] text-text-muted mt-0.5 leading-snug">{step.desc}</div>
              </div>
              <span className={`text-[8px] font-space font-semibold shrink-0 ${step.color}`}>{step.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
