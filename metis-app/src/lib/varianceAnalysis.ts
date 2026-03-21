// ─── Variance Analysis Engine ─────────────────────────────────────────────────
// Decomposizione varianze KPI azienda vs benchmark ATECO e soglie di rischio.
// Output strutturato per rendering waterfall + narrative XAI.

import {
  ParsedBilancio,
  RiskModelResults,
  BenchmarkComparison,
  VarianceItem,
  WaterfallItem,
  VarianceAnalysisResult,
  VarianceClassification,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function classify(
  delta: number,
  higherIsBetter: boolean
): VarianceClassification {
  if (Math.abs(delta) < 0.5) return 'NEUTRALE';
  if (higherIsBetter) return delta > 0 ? 'FAVOREVOLE' : 'SFAVOREVOLE';
  return delta < 0 ? 'FAVOREVOLE' : 'SFAVOREVOLE';
}

function severity(classificazione: VarianceClassification, absPercent: number): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (classificazione === 'NEUTRALE' || classificazione === 'FAVOREVOLE') return 'INFO';
  if (absPercent > 30) return 'CRITICAL';
  if (absPercent > 15) return 'WARNING';
  return 'INFO';
}

function safeDeltaPct(azienda: number, riferimento: number): number {
  if (riferimento === 0) return azienda === 0 ? 0 : 100;
  return Math.round(((azienda - riferimento) / Math.abs(riferimento)) * 10000) / 100;
}

// ── Soglie di Rischio Standard ──────────────────────────────────────────────
const SOGLIE = {
  ebitdaMargin: { value: 5, label: 'EBITDA Margin minimo accettabile', higherIsBetter: true },
  altmanScore: { value: 1.23, label: 'Soglia distress Altman Z\'-Score (private firms)', higherIsBetter: true },
  dscrBase: { value: 1.0, label: 'DSCR minimo copertura debito', higherIsBetter: true },
  leverage: { value: 4.0, label: 'Leverage massimo accettabile (D/PN)', higherIsBetter: false },
  pd: { value: 5.0, label: 'PD massima accettabile', higherIsBetter: false },
  currentRatio: { value: 1.0, label: 'Current Ratio minimo', higherIsBetter: true },
} as const;

// ── Narrativa Italiana ──────────────────────────────────────────────────────
function narrativaBenchmark(kpi: string, azienda: number, settore: number, classificazione: VarianceClassification, sett: string): string {
  const delta = azienda - settore;
  const dir = delta >= 0 ? 'superiore' : 'inferiore';
  if (classificazione === 'NEUTRALE') {
    return `${kpi} dell'azienda (${azienda.toFixed(2)}) è in linea con la media del settore ${sett} (${settore.toFixed(2)}). Nessuna deviazione significativa.`;
  }
  if (classificazione === 'FAVOREVOLE') {
    return `${kpi} dell'azienda (${azienda.toFixed(2)}) è ${dir} alla media settore ${sett} (${settore.toFixed(2)}) di ${Math.abs(delta).toFixed(2)}. Questo indica un posizionamento competitivo positivo.`;
  }
  return `${kpi} dell'azienda (${azienda.toFixed(2)}) è ${dir} alla media settore ${sett} (${settore.toFixed(2)}) di ${Math.abs(delta).toFixed(2)}. Questo rappresenta un segnale di attenzione da monitorare.`;
}

function narrativaSoglia(kpi: string, azienda: number, soglia: number, classificazione: VarianceClassification, sogliaLabel: string): string {
  if (classificazione === 'NEUTRALE' || classificazione === 'FAVOREVOLE') {
    return `${kpi} (${azienda.toFixed(2)}) supera la soglia critica (${soglia.toFixed(2)} — ${sogliaLabel}). Parametro entro i limiti di accettabilità.`;
  }
  return `ATTENZIONE: ${kpi} (${azienda.toFixed(2)}) non raggiunge la soglia minima (${soglia.toFixed(2)} — ${sogliaLabel}). Questo KPI rappresenta un fattore di rischio significativo.`;
}

// ── Benchmark Variance ──────────────────────────────────────────────────────
function analyzeBenchmarkVariances(
  b: ParsedBilancio,
  models: RiskModelResults,
  bench: BenchmarkComparison
): VarianceItem[] {
  const sett = bench.settore.descrizione;
  const leverage = b.totaleDebiti / Math.max(b.patrimonioNetto, 1);
  const currentRatio = b.attivoCorrenti / Math.max(b.passivoCorrenti, 1);

  const items: { kpi: string; azienda: number; riferimento: number; higherIsBetter: boolean }[] = [
    { kpi: 'EBITDA Margin (%)', azienda: b.ebitdaMargin, riferimento: bench.settore.ebitdaMarginMedia, higherIsBetter: true },
    { kpi: 'Altman Z-Score', azienda: models.altman.score, riferimento: bench.settore.altmanMedia, higherIsBetter: true },
    { kpi: 'DSCR Base', azienda: models.dscr.base, riferimento: bench.settore.dscrMedia, higherIsBetter: true },
    { kpi: 'Leverage (D/PN)', azienda: leverage, riferimento: bench.settore.leverageMedia, higherIsBetter: false },
    { kpi: 'Current Ratio', azienda: currentRatio, riferimento: bench.settore.currentRatioMedia, higherIsBetter: true },
    { kpi: 'ROI (%)', azienda: (b.ebit / Math.max(b.totaleAttivo, 1)) * 100, riferimento: bench.settore.roiMedia, higherIsBetter: true },
  ];

  return items.map(item => {
    const delta = Math.round((item.azienda - item.riferimento) * 100) / 100;
    const deltaPercent = safeDeltaPct(item.azienda, item.riferimento);
    const cls = classify(delta, item.higherIsBetter);
    return {
      kpi: item.kpi,
      azienda: Math.round(item.azienda * 100) / 100,
      riferimento: Math.round(item.riferimento * 100) / 100,
      riferimentoLabel: `Benchmark ATECO ${bench.settore.codice}`,
      delta,
      deltaPercent,
      classificazione: cls,
      narrativa: narrativaBenchmark(item.kpi, item.azienda, item.riferimento, cls, sett),
      severity: severity(cls, Math.abs(deltaPercent)),
    };
  });
}

// ── Soglie Variance ─────────────────────────────────────────────────────────
function analyzeSoglieVariances(
  b: ParsedBilancio,
  models: RiskModelResults,
  pd: number
): VarianceItem[] {
  const leverage = b.totaleDebiti / Math.max(b.patrimonioNetto, 1);
  const currentRatio = b.attivoCorrenti / Math.max(b.passivoCorrenti, 1);

  const items: { kpi: string; azienda: number; sogliaKey: keyof typeof SOGLIE }[] = [
    { kpi: 'EBITDA Margin (%)', azienda: b.ebitdaMargin, sogliaKey: 'ebitdaMargin' },
    { kpi: 'Altman Z-Score', azienda: models.altman.score, sogliaKey: 'altmanScore' },
    { kpi: 'DSCR Base', azienda: models.dscr.base, sogliaKey: 'dscrBase' },
    { kpi: 'Leverage (D/PN)', azienda: leverage, sogliaKey: 'leverage' },
    { kpi: 'PD Stimata (%)', azienda: pd, sogliaKey: 'pd' },
    { kpi: 'Current Ratio', azienda: currentRatio, sogliaKey: 'currentRatio' },
  ];

  return items.map(item => {
    const soglia = SOGLIE[item.sogliaKey];
    const delta = Math.round((item.azienda - soglia.value) * 100) / 100;
    const deltaPercent = safeDeltaPct(item.azienda, soglia.value);
    const cls = classify(delta, soglia.higherIsBetter);
    return {
      kpi: item.kpi,
      azienda: Math.round(item.azienda * 100) / 100,
      riferimento: soglia.value,
      riferimentoLabel: soglia.label,
      delta,
      deltaPercent,
      classificazione: cls,
      narrativa: narrativaSoglia(item.kpi, item.azienda, soglia.value, cls, soglia.label),
      severity: severity(cls, Math.abs(deltaPercent)),
    };
  });
}

// ── Waterfall Data ──────────────────────────────────────────────────────────
function generateWaterfall(vsBenchmark: VarianceItem[]): WaterfallItem[] {
  const items: WaterfallItem[] = [];
  let cumulative = 0;

  for (const v of vsBenchmark) {
    // Normalize delta to a comparable scale (delta percent capped)
    const normalizedValue = Math.max(-50, Math.min(50, v.deltaPercent));
    cumulative += normalizedValue;
    items.push({
      label: v.kpi,
      value: Math.round(normalizedValue * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
      type: normalizedValue >= 0 ? 'positive' : 'negative',
      color: normalizedValue >= 0 ? 'var(--color-green)' : 'var(--color-red)',
    });
  }

  items.push({
    label: 'Posizione Netta',
    value: Math.round(cumulative * 10) / 10,
    cumulative: Math.round(cumulative * 10) / 10,
    type: 'total',
    color: cumulative >= 0 ? 'var(--color-cyan)' : 'var(--color-yellow)',
  });

  return items;
}

// ── Summary Narrative ───────────────────────────────────────────────────────
function generateSummary(vsBenchmark: VarianceItem[], vsSoglie: VarianceItem[]): string {
  const sfavorevoliBench = vsBenchmark.filter(v => v.classificazione === 'SFAVOREVOLE');
  const criticiSoglie = vsSoglie.filter(v => v.severity === 'CRITICAL');

  if (criticiSoglie.length === 0 && sfavorevoliBench.length === 0) {
    return 'L\'analisi delle varianze non evidenzia criticità rilevanti. Tutti i KPI sono entro le soglie di accettabilità e in linea o sopra la media settoriale.';
  }

  const parts: string[] = [];
  if (sfavorevoliBench.length > 0) {
    parts.push(`${sfavorevoliBench.length} KPI sotto la media di settore (${sfavorevoliBench.map(v => v.kpi).join(', ')})`);
  }
  if (criticiSoglie.length > 0) {
    parts.push(`${criticiSoglie.length} KPI oltre le soglie critiche (${criticiSoglie.map(v => v.kpi).join(', ')})`);
  }

  return `Variance Analysis: ${parts.join('; ')}. Si raccomanda un esame approfondito dei fattori sottostanti prima della delibera.`;
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function runVarianceAnalysis(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  benchmark: BenchmarkComparison,
  pd: number
): VarianceAnalysisResult {
  const vsBenchmark = analyzeBenchmarkVariances(bilancio, models, benchmark);
  const vsSoglie = analyzeSoglieVariances(bilancio, models, pd);
  const waterfall = generateWaterfall(vsBenchmark);
  const summaryNarrative = generateSummary(vsBenchmark, vsSoglie);

  return { vsBenchmark, vsSoglie, waterfall, summaryNarrative };
}
