// ─── Anomaly Detector ─────────────────────────────────────────────────────────
// Rilevamento anomalie e red flags nei dati finanziari.
// Z-score analysis, regole deterministiche, classificazione severity.
// Ogni anomalia cita la fonte dati (XAI traceability).

import {
  ParsedBilancio,
  RiskModelResults,
  BenchmarkComparison,
  Anomaly,
  AnomalyDetectorResult,
  AnomalySeverity,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────
let anomalyCounter = 0;
function genId(): string {
  anomalyCounter++;
  return `ANO-${Date.now()}-${anomalyCounter.toString().padStart(3, '0')}`;
}

function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return Math.round(((value - mean) / stdDev) * 100) / 100;
}

// Stima stddev approssimativa come ~25% della media (conservative per settore)
function estimateStdDev(mean: number): number {
  return Math.abs(mean) * 0.25;
}

// ── Z-Score Anomalies (vs Benchmark) ────────────────────────────────────────
function detectZScoreAnomalies(
  b: ParsedBilancio,
  models: RiskModelResults,
  bench: BenchmarkComparison
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const leverage = b.totaleDebiti / Math.max(b.patrimonioNetto, 1);
  const currentRatio = b.attivoCorrenti / Math.max(b.passivoCorrenti, 1);
  const roi = (b.ebit / Math.max(b.totaleAttivo, 1)) * 100;

  const checks: {
    kpi: string;
    value: number;
    mean: number;
    higherIsBetter: boolean;
    source: string;
  }[] = [
    { kpi: 'EBITDA Margin', value: b.ebitdaMargin, mean: bench.settore.ebitdaMarginMedia, higherIsBetter: true, source: 'Conto Economico → EBITDA / Ricavi' },
    { kpi: 'Altman Z-Score', value: models.altman.score, mean: bench.settore.altmanMedia, higherIsBetter: true, source: 'Modello Altman (1968) → componenti X1-X5' },
    { kpi: 'DSCR', value: models.dscr.base, mean: bench.settore.dscrMedia, higherIsBetter: true, source: 'EBITDA / Debt Service annuale' },
    { kpi: 'Leverage', value: leverage, mean: bench.settore.leverageMedia, higherIsBetter: false, source: 'Stato Patrimoniale → Totale Debiti / Patrimonio Netto' },
    { kpi: 'Current Ratio', value: currentRatio, mean: bench.settore.currentRatioMedia, higherIsBetter: true, source: 'Stato Patrimoniale → Attivo Corrente / Passivo Corrente' },
    { kpi: 'ROI', value: roi, mean: bench.settore.roiMedia, higherIsBetter: true, source: 'EBIT / Totale Attivo' },
  ];

  for (const check of checks) {
    const stdDev = estimateStdDev(check.mean);
    const z = computeZScore(check.value, check.mean, stdDev);

    // Only flag anomalies where z-score is unfavorable and significant
    const isUnfavorable = check.higherIsBetter ? z < -1.5 : z > 1.5;
    if (!isUnfavorable) continue;

    const absZ = Math.abs(z);
    let sev: AnomalySeverity = 'INFO';
    if (absZ > 3) sev = 'ALERT';
    else if (absZ > 2.5) sev = 'CRITICAL';
    else if (absZ > 2) sev = 'WARNING';

    const dir = check.higherIsBetter ? 'inferiore' : 'superiore';
    anomalies.push({
      id: genId(),
      kpi: check.kpi,
      severity: sev,
      type: 'ZSCORE',
      title: `${check.kpi} devia significativamente dal benchmark`,
      description: `${check.kpi} dell'azienda (${check.value.toFixed(2)}) è significativamente ${dir} alla media di settore (${check.mean.toFixed(2)}). Z-Score: ${z.toFixed(2)} (${absZ > 2 ? 'outlier statistico' : 'deviazione significativa'}).`,
      value: check.value,
      threshold: check.mean,
      zScore: z,
      source: check.source,
    });
  }

  return anomalies;
}

// ── Rule-Based Red Flags ────────────────────────────────────────────────────
function detectRuleBasedAnomalies(
  b: ParsedBilancio,
  models: RiskModelResults,
  pd: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const leverage = b.totaleDebiti / Math.max(b.patrimonioNetto, 1);

  // EBITDA Negativo
  if (b.ebitda < 0) {
    anomalies.push({
      id: genId(),
      kpi: 'EBITDA',
      severity: 'ALERT',
      type: 'RULE',
      title: 'EBITDA Negativo',
      description: `L'azienda presenta un EBITDA negativo (€${b.ebitda.toLocaleString('it-IT')}). L'attività operativa non genera margine: rischio di non sostenibilità del business model.`,
      value: b.ebitda,
      threshold: 0,
      source: 'Conto Economico → Ricavi - Costi Operativi',
    });
  }

  // EBITDA Margin < 3%
  if (b.ebitdaMargin > 0 && b.ebitdaMargin < 3) {
    anomalies.push({
      id: genId(),
      kpi: 'EBITDA Margin',
      severity: 'CRITICAL',
      type: 'RULE',
      title: 'Marginalità operativa critica',
      description: `EBITDA Margin al ${b.ebitdaMargin.toFixed(1)}% — margine operativo estremamente ridotto che non lascia buffer per imprevisti.`,
      value: b.ebitdaMargin,
      threshold: 3,
      source: 'Conto Economico → EBITDA / Ricavi',
    });
  }

  // Leverage > 5x
  if (leverage > 5) {
    anomalies.push({
      id: genId(),
      kpi: 'Leverage',
      severity: 'ALERT',
      type: 'RULE',
      title: 'Leverage estremo',
      description: `Il rapporto Debiti/Patrimonio Netto è ${leverage.toFixed(2)}x (soglia critica: 5x). L'azienda è fortemente dipendente dal finanziamento esterno con rischio strutturale.`,
      value: leverage,
      threshold: 5,
      source: 'Stato Patrimoniale → Totale Debiti / Patrimonio Netto',
    });
  } else if (leverage > 3) {
    anomalies.push({
      id: genId(),
      kpi: 'Leverage',
      severity: 'WARNING',
      type: 'RULE',
      title: 'Leverage elevato',
      description: `Il rapporto Debiti/PN è ${leverage.toFixed(2)}x (soglia attenzione: 3x). Il livello di indebitamento richiede monitoraggio.`,
      value: leverage,
      threshold: 3,
      source: 'Stato Patrimoniale → Totale Debiti / Patrimonio Netto',
    });
  }

  // PD > 10%
  if (pd > 10) {
    anomalies.push({
      id: genId(),
      kpi: 'PD Stimata',
      severity: 'ALERT',
      type: 'RULE',
      title: 'Probabilità di Default elevata',
      description: `PD consensus al ${pd.toFixed(2)}% (soglia critica: 10%). I modelli di scoring convergono verso un rischio di insolvenza molto alto.`,
      value: pd,
      threshold: 10,
      source: 'Consensus PD → Media ponderata Altman, Ohlson, Zmijewski',
    });
  } else if (pd > 5) {
    anomalies.push({
      id: genId(),
      kpi: 'PD Stimata',
      severity: 'CRITICAL',
      type: 'RULE',
      title: 'Probabilità di Default sopra soglia',
      description: `PD consensus al ${pd.toFixed(2)}% (soglia attenzione: 5%). Rischio di insolvenza significativo.`,
      value: pd,
      threshold: 5,
      source: 'Consensus PD → Media ponderata Altman, Ohlson, Zmijewski',
    });
  }

  // Altman < 1.81
  if (models.altman.score < 1.81) {
    anomalies.push({
      id: genId(),
      kpi: 'Altman Z-Score',
      severity: 'CRITICAL',
      type: 'RULE',
      title: 'Z-Score in Distress Zone',
      description: `Altman Z-Score a ${models.altman.score} (soglia distress: 1.81). Il modello indica probabilità elevata di insolvenza entro 24 mesi.`,
      value: models.altman.score,
      threshold: 1.81,
      source: 'Modello Altman (1968) → Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + X5',
    });
  }

  // DSCR < 1.0
  if (models.dscr.base < 1.0) {
    anomalies.push({
      id: genId(),
      kpi: 'DSCR Base',
      severity: 'ALERT',
      type: 'RULE',
      title: 'Cash flow insufficiente per servizio debito',
      description: `DSCR base a ${models.dscr.base}x (soglia minima: 1.0x). L'EBITDA generato non copre il servizio del debito annuale.`,
      value: models.dscr.base,
      threshold: 1.0,
      source: 'EBITDA / (Quota Capitale + Interessi Passivi)',
    });
  } else if (models.dscr.base < 1.1) {
    anomalies.push({
      id: genId(),
      kpi: 'DSCR Base',
      severity: 'WARNING',
      type: 'RULE',
      title: 'DSCR marginale',
      description: `DSCR base a ${models.dscr.base}x — buffer minimo sul servizio del debito. Qualsiasi contrazione dell'EBITDA porterebbe sotto soglia.`,
      value: models.dscr.base,
      threshold: 1.1,
      source: 'EBITDA / (Quota Capitale + Interessi Passivi)',
    });
  }

  // DSCR Stress < 1.0
  if (models.dscr.stress < 1.0 && models.dscr.base >= 1.0) {
    anomalies.push({
      id: genId(),
      kpi: 'DSCR Stress',
      severity: 'WARNING',
      type: 'RULE',
      title: 'DSCR sotto soglia in scenario stress',
      description: `In scenario stress (-20% EBITDA, +10% costo debito), il DSCR scende a ${models.dscr.stress}x. L'azienda non sopporterebbe condizioni avverse.`,
      value: models.dscr.stress,
      threshold: 1.0,
      source: 'DSCR Stress → (EBITDA × 0.8) / (Debt Service × 1.1)',
    });
  }

  // Patrimonio Netto negativo
  if (b.patrimonioNetto < 0) {
    anomalies.push({
      id: genId(),
      kpi: 'Patrimonio Netto',
      severity: 'ALERT',
      type: 'RULE',
      title: 'Patrimonio Netto negativo',
      description: `Patrimonio Netto negativo (€${b.patrimonioNetto.toLocaleString('it-IT')}). L'azienda è tecnicamente in stato di insolvenza patrimoniale (art. 2447 c.c.).`,
      value: b.patrimonioNetto,
      threshold: 0,
      source: 'Stato Patrimoniale → Patrimonio Netto',
    });
  }

  // Working Capital negativo
  if (b.capitaleDiLavoro < 0) {
    anomalies.push({
      id: genId(),
      kpi: 'Working Capital',
      severity: 'WARNING',
      type: 'RULE',
      title: 'Capitale circolante negativo',
      description: `Working Capital negativo (€${b.capitaleDiLavoro.toLocaleString('it-IT')}). L'azienda potrebbe avere difficoltà a far fronte alle obbligazioni a breve termine.`,
      value: b.capitaleDiLavoro,
      threshold: 0,
      source: 'Stato Patrimoniale → Attivo Corrente - Passivo Corrente',
    });
  }

  // Utile Netto negativo
  if (b.utileNetto < 0) {
    anomalies.push({
      id: genId(),
      kpi: 'Utile Netto',
      severity: 'WARNING',
      type: 'RULE',
      title: 'Esercizio in perdita',
      description: `L'azienda ha chiuso l'esercizio in perdita (€${b.utileNetto.toLocaleString('it-IT')}). La capacità di generare reddito è compromessa.`,
      value: b.utileNetto,
      threshold: 0,
      source: 'Conto Economico → Risultato Netto',
    });
  }

  // Oneri finanziari > 5% dei ricavi
  const oneriPctRicavi = b.ricavi > 0 ? (b.oneriFinanziari / b.ricavi) * 100 : 0;
  if (oneriPctRicavi > 5) {
    anomalies.push({
      id: genId(),
      kpi: 'Oneri Finanziari / Ricavi',
      severity: oneriPctRicavi > 10 ? 'CRITICAL' : 'WARNING',
      type: 'RULE',
      title: 'Peso eccessivo oneri finanziari',
      description: `Gli oneri finanziari assorbono il ${oneriPctRicavi.toFixed(1)}% dei ricavi (soglia: 5%). Il costo del debito erode significativamente la marginalità.`,
      value: oneriPctRicavi,
      threshold: 5,
      source: 'Conto Economico → Oneri Finanziari / Ricavi',
    });
  }

  return anomalies;
}

// ── Compute Overall Risk ────────────────────────────────────────────────────
function computeOverallRisk(anomalies: Anomaly[]): 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO' {
  const counts: Record<AnomalySeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0, ALERT: 0 };
  for (const a of anomalies) counts[a.severity]++;

  if (counts.ALERT > 0) return 'CRITICO';
  if (counts.CRITICAL >= 2) return 'CRITICO';
  if (counts.CRITICAL >= 1 || counts.WARNING >= 3) return 'ALTO';
  if (counts.WARNING >= 1) return 'MEDIO';
  return 'BASSO';
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function detectAnomalies(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  benchmark: BenchmarkComparison,
  pd: number
): AnomalyDetectorResult {
  anomalyCounter = 0;

  const zScoreAnomalies = detectZScoreAnomalies(bilancio, models, benchmark);
  const ruleAnomalies = detectRuleBasedAnomalies(bilancio, models, pd);

  // Merge and deduplicate by KPI (keep highest severity)
  const allAnomalies = [...ruleAnomalies, ...zScoreAnomalies];
  const byKpi = new Map<string, Anomaly>();
  const severityOrder: Record<AnomalySeverity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2, ALERT: 3 };

  for (const a of allAnomalies) {
    const existing = byKpi.get(a.kpi);
    if (!existing || severityOrder[a.severity] > severityOrder[existing.severity]) {
      byKpi.set(a.kpi, a);
    }
  }

  const anomalies = Array.from(byKpi.values()).sort(
    (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
  );

  const counts: Record<AnomalySeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0, ALERT: 0 };
  for (const a of anomalies) counts[a.severity]++;

  return {
    anomalies,
    summary: {
      total: anomalies.length,
      byLevel: counts,
      overallRisk: computeOverallRisk(anomalies),
    },
  };
}
