// ─── Metis MVP — Cluster Analysis Engine ──────────────────────────────────────
// Clusterizzazione debitori per revenue band, risk profile e settore macro.
// Confronto performance azienda vs benchmark del cluster di appartenenza.

import type { ParsedBilancio, RiskModelResults } from './types';

// ── Dimensioni di clustering ────────────────────────────────────────────────

export type RevenueBand = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';
export type RiskProfile = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
export type SettoreMacro = 'MANIFATTURIERO' | 'SERVIZI' | 'COMMERCIO' | 'COSTRUZIONI' | 'TECH';

export interface ClusterKey {
  revenueBand: RevenueBand;
  riskProfile: RiskProfile;
  settoreMacro: SettoreMacro;
}

export interface ClusterBenchmark {
  dscrMedio: number;
  ebitdaMarginMedio: number;
  leverageMedio: number;      // Debiti / PN
  currentRatioMedio: number;
  pdMedia: number;
  // Percentili per sparkline range
  percentili: {
    dscr:         { min: number; p25: number; media: number; p75: number; max: number };
    ebitdaMargin: { min: number; p25: number; media: number; p75: number; max: number };
    leverage:     { min: number; p25: number; media: number; p75: number; max: number };
    currentRatio: { min: number; p25: number; media: number; p75: number; max: number };
    pd:           { min: number; p25: number; media: number; p75: number; max: number };
  };
}

export interface MetricComparison {
  metrica: string;
  azienda: number;
  cluster: number;
  delta: number;       // valore assoluto (azienda - cluster)
  deltaPercent: number; // (azienda - cluster) / cluster * 100
  segnale: 'VERDE' | 'GIALLO' | 'ROSSO';
  range: { min: number; p25: number; media: number; p75: number; max: number };
}

export interface ClusterComparisonResult {
  cluster: ClusterKey;
  clusterLabel: string;
  benchmark: ClusterBenchmark;
  metriche: MetricComparison[];
  earlyWarning: boolean;
  signals: string[];
}

// ── Revenue Band Assignment ─────────────────────────────────────────────────

function assignRevenueBand(ricavi: number): RevenueBand {
  if (ricavi < 500_000)    return 'MICRO';
  if (ricavi < 2_000_000)  return 'SMALL';
  if (ricavi < 10_000_000) return 'MEDIUM';
  return 'LARGE';
}

// ── Risk Profile Assignment ─────────────────────────────────────────────────

function assignRiskProfile(pd: number): RiskProfile {
  if (pd < 0.02) return 'LOW_RISK';
  if (pd < 0.05) return 'MEDIUM_RISK';
  return 'HIGH_RISK';
}

// ── Settore Macro Mapping ───────────────────────────────────────────────────

const SETTORE_MAP: Record<string, SettoreMacro> = {
  // Manifatturiero
  manifattura: 'MANIFATTURIERO', manifatturiero: 'MANIFATTURIERO',
  produzione: 'MANIFATTURIERO', industria: 'MANIFATTURIERO',
  meccanica: 'MANIFATTURIERO', metalmeccanica: 'MANIFATTURIERO',
  alimentare: 'MANIFATTURIERO', tessile: 'MANIFATTURIERO',
  chimico: 'MANIFATTURIERO', farmaceutico: 'MANIFATTURIERO',
  // Servizi
  servizi: 'SERVIZI', consulenza: 'SERVIZI', logistica: 'SERVIZI',
  trasporti: 'SERVIZI', turismo: 'SERVIZI', sanità: 'SERVIZI',
  formazione: 'SERVIZI', professionale: 'SERVIZI',
  // Commercio
  commercio: 'COMMERCIO', retail: 'COMMERCIO', distribuzione: 'COMMERCIO',
  ingrosso: 'COMMERCIO', vendita: 'COMMERCIO', gdo: 'COMMERCIO',
  // Costruzioni
  costruzioni: 'COSTRUZIONI', edilizia: 'COSTRUZIONI', immobiliare: 'COSTRUZIONI',
  infrastrutture: 'COSTRUZIONI', impiantistica: 'COSTRUZIONI',
  // Tech
  tech: 'TECH', tecnologia: 'TECH', software: 'TECH', ict: 'TECH',
  digitale: 'TECH', informatica: 'TECH', telecomunicazioni: 'TECH',
};

function assignSettoreMacro(settore: string): SettoreMacro {
  const lower = settore.toLowerCase().trim();
  for (const [keyword, macro] of Object.entries(SETTORE_MAP)) {
    if (lower.includes(keyword)) return macro;
  }
  return 'SERVIZI'; // fallback
}

// ── Benchmark Mock Database ─────────────────────────────────────────────────
// Benchmark realistici per il mercato italiano. Chiave: "REVENUE|RISK|SETTORE"

function benchmarkKey(c: ClusterKey): string {
  return `${c.revenueBand}|${c.riskProfile}|${c.settoreMacro}`;
}

// Genera benchmark parametrici realistici basati sulle dimensioni del cluster
function generateBenchmark(c: ClusterKey): ClusterBenchmark {
  // Base values per settore
  const settoreBase: Record<SettoreMacro, { dscr: number; ebitda: number; leverage: number; cr: number; pd: number }> = {
    MANIFATTURIERO: { dscr: 1.45, ebitda: 9.5,  leverage: 2.8, cr: 1.35, pd: 0.032 },
    SERVIZI:        { dscr: 1.55, ebitda: 12.0, leverage: 2.2, cr: 1.40, pd: 0.028 },
    COMMERCIO:      { dscr: 1.30, ebitda: 5.5,  leverage: 3.2, cr: 1.20, pd: 0.038 },
    COSTRUZIONI:    { dscr: 1.20, ebitda: 7.0,  leverage: 3.5, cr: 1.10, pd: 0.045 },
    TECH:           { dscr: 1.65, ebitda: 15.0, leverage: 1.8, cr: 1.55, pd: 0.022 },
  };

  // Modificatori per revenue band (le aziende più grandi tendono ad essere più stabili)
  const revenueAdj: Record<RevenueBand, number> = {
    MICRO:  -0.15,
    SMALL:  -0.05,
    MEDIUM:  0.05,
    LARGE:   0.12,
  };

  // Modificatori per risk profile
  const riskAdj: Record<RiskProfile, { dscr: number; ebitda: number; leverage: number; cr: number; pd: number }> = {
    LOW_RISK:    { dscr:  0.35, ebitda:  3.0, leverage: -0.8, cr:  0.25, pd: -0.020 },
    MEDIUM_RISK: { dscr:  0.00, ebitda:  0.0, leverage:  0.0, cr:  0.00, pd:  0.000 },
    HIGH_RISK:   { dscr: -0.30, ebitda: -3.5, leverage:  1.2, cr: -0.20, pd:  0.035 },
  };

  const base = settoreBase[c.settoreMacro];
  const rAdj = revenueAdj[c.revenueBand];
  const kAdj = riskAdj[c.riskProfile];

  const dscr         = Math.max(0.4, base.dscr    + rAdj + kAdj.dscr);
  const ebitdaMargin = Math.max(1.0, base.ebitda   + rAdj * 10 + kAdj.ebitda);
  const leverage     = Math.max(0.5, base.leverage - rAdj * 2 + kAdj.leverage);
  const currentRatio = Math.max(0.5, base.cr       + rAdj + kAdj.cr);
  const pd           = Math.max(0.002, Math.min(0.25, base.pd + kAdj.pd));

  // Spread per percentili (dispersion realistiche)
  const spread = (v: number, pct: number) => {
    const s = v * pct;
    return {
      min:   Math.max(0, +(v - s * 2.5).toFixed(4)),
      p25:   Math.max(0, +(v - s * 0.8).toFixed(4)),
      media: +v.toFixed(4),
      p75:   +(v + s * 0.8).toFixed(4),
      max:   +(v + s * 2.5).toFixed(4),
    };
  };

  // Per leverage e PD: "peggiore" = più alto, inversione concettuale gestita in confronto
  const spreadInverse = (v: number, pct: number) => {
    const s = v * pct;
    return {
      min:   Math.max(0, +(v - s * 2.5).toFixed(4)),
      p25:   +(v - s * 0.8).toFixed(4),
      media: +v.toFixed(4),
      p75:   +(v + s * 0.8).toFixed(4),
      max:   +(v + s * 2.5).toFixed(4),
    };
  };

  return {
    dscrMedio:         +dscr.toFixed(2),
    ebitdaMarginMedio: +ebitdaMargin.toFixed(1),
    leverageMedio:     +leverage.toFixed(2),
    currentRatioMedio: +currentRatio.toFixed(2),
    pdMedia:           +pd.toFixed(4),
    percentili: {
      dscr:         spread(dscr, 0.30),
      ebitdaMargin: spread(ebitdaMargin, 0.35),
      leverage:     spreadInverse(leverage, 0.30),
      currentRatio: spread(currentRatio, 0.25),
      pd:           spreadInverse(pd, 0.40),
    },
  };
}

// Cache dei benchmark
const benchmarkCache = new Map<string, ClusterBenchmark>();

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Assegna il cluster di appartenenza a un debitore
 */
export function assignCluster(bilancio: ParsedBilancio, pd: number): ClusterKey {
  return {
    revenueBand:  assignRevenueBand(bilancio.ricavi),
    riskProfile:  assignRiskProfile(pd),
    settoreMacro: assignSettoreMacro(bilancio.settore),
  };
}

/**
 * Ritorna le metriche benchmark per un dato cluster
 */
export function getClusterBenchmark(cluster: ClusterKey): ClusterBenchmark {
  const key = benchmarkKey(cluster);
  if (!benchmarkCache.has(key)) {
    benchmarkCache.set(key, generateBenchmark(cluster));
  }
  return benchmarkCache.get(key)!;
}

/**
 * Confronta le metriche aziendali con il benchmark del cluster.
 * Ritorna delta, segnali e early warning.
 */
export function compareToCluster(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  pd: number,
): ClusterComparisonResult {
  const cluster   = assignCluster(bilancio, pd);
  const benchmark = getClusterBenchmark(cluster);

  // Calcola metriche aziendali
  const azDscr         = models.dscr.base;
  const azEbitdaMargin = bilancio.ebitdaMargin;
  const azLeverage     = bilancio.patrimonioNetto !== 0
    ? bilancio.totaleDebiti / bilancio.patrimonioNetto
    : 99.99;
  const azCurrentRatio = bilancio.passivoCorrenti !== 0
    ? bilancio.attivoCorrenti / bilancio.passivoCorrenti
    : 0;
  const azPd           = pd;

  // Helper: calcola segnale
  // Per DSCR, EBITDA margin, current ratio: più alto = meglio
  // Per leverage, PD: più basso = meglio
  function buildMetric(
    nome: string,
    azienda: number,
    clusterVal: number,
    range: { min: number; p25: number; media: number; p75: number; max: number },
    higherIsBetter: boolean,
  ): MetricComparison {
    const delta = +(azienda - clusterVal).toFixed(4);
    const deltaPercent = clusterVal !== 0 ? +((delta / clusterVal) * 100).toFixed(1) : 0;

    let segnale: 'VERDE' | 'GIALLO' | 'ROSSO';
    if (higherIsBetter) {
      if (azienda >= range.p75)      segnale = 'VERDE';
      else if (azienda >= range.p25) segnale = 'GIALLO';
      else                           segnale = 'ROSSO';
    } else {
      // Per leverage / PD: più basso = meglio
      if (azienda <= range.p25)      segnale = 'VERDE';
      else if (azienda <= range.p75) segnale = 'GIALLO';
      else                           segnale = 'ROSSO';
    }

    return { metrica: nome, azienda: +azienda.toFixed(4), cluster: clusterVal, delta, deltaPercent, segnale, range };
  }

  const metriche: MetricComparison[] = [
    buildMetric('DSCR',          azDscr,         benchmark.dscrMedio,         benchmark.percentili.dscr,         true),
    buildMetric('EBITDA Margin',  azEbitdaMargin, benchmark.ebitdaMarginMedio, benchmark.percentili.ebitdaMargin, true),
    buildMetric('Leverage',      azLeverage,     benchmark.leverageMedio,     benchmark.percentili.leverage,     false),
    buildMetric('Current Ratio', azCurrentRatio, benchmark.currentRatioMedio, benchmark.percentili.currentRatio, true),
    buildMetric('PD',            azPd,           benchmark.pdMedia,           benchmark.percentili.pd,           false),
  ];

  // Early warning: più di 2 metriche ROSSO (sotto 25° percentile)
  const redCount = metriche.filter(m => m.segnale === 'ROSSO').length;
  const earlyWarning = redCount > 2;

  // Genera signals descrittivi
  const signals: string[] = [];
  for (const m of metriche) {
    if (m.segnale === 'ROSSO') {
      signals.push(`${m.metrica}: ${m.azienda.toFixed(2)} vs cluster ${m.cluster.toFixed(2)} (${m.deltaPercent > 0 ? '+' : ''}${m.deltaPercent}%) — sotto il 25° percentile del cluster`);
    }
  }

  if (earlyWarning) {
    signals.unshift(`EARLY WARNING: ${redCount} metriche su 5 sono sotto il 25° percentile del cluster di riferimento.`);
  }

  const clusterLabel = `${cluster.revenueBand} · ${cluster.riskProfile} · ${cluster.settoreMacro}`;

  return {
    cluster,
    clusterLabel,
    benchmark,
    metriche,
    earlyWarning,
    signals,
  };
}
