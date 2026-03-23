// ─── Dossier Orchestrator ─────────────────────────────────────────────────────
// Chains all analysis engines into a single pipeline.
// For demo companies (no uploaded file), generates synthetic ParsedBilancio data.

import { ParsedBilancio, RiskModelResults, BenchmarkComparison, NarrativeModule, AuditEntry, FinancialStatements, VarianceAnalysisResult, AnomalyDetectorResult, FairnessCheckResult } from './types';
import { calculateAllModels, estimatePD } from './riskModels';
import { compareBenchmark } from './atecoBenchmarks';
import { generateFinancialStatements } from './financialStatements';
import { runVarianceAnalysis } from './varianceAnalysis';
import { detectAnomalies } from './anomalyDetector';
import { runFairnessCheck } from './fairnessCheck';
import { generateAllNarratives } from './narrativeGenerator';
import { addAuditEntry, loadAuditLog } from './auditTrail';

// ── Synthetic Bilancio for demo companies ────────────────────────────────────
const DEMO_BILANCI: Record<number, ParsedBilancio> = {
  1: { // Alpha S.p.A.
    companyName: 'Alpha S.p.A.', partitaIva: '12345678901', settore: 'Fabbricazione di macchinari', dataChiusura: '31/12/2025', area_geografica: 'Nord-Ovest',
    ricavi: 18500000, costiOperativi: 15725000, ebitda: 2775000, ebitdaMargin: 15.0, ammortamenti: 740000, ebit: 2035000,
    oneriFinanziari: 320000, risultatoLordo: 1715000, imposte: 514500, utileNetto: 1200500,
    totaleAttivo: 22000000, attivoCorrenti: 9900000, cassa: 1200000, crediti: 5500000, rimanenze: 3200000, attivoFisso: 12100000,
    totalePassivo: 22000000, passivoCorrenti: 6600000, debitiVersoBanche: 4200000, debitiBreveTermine: 6600000, debitiLungoTermine: 5400000,
    totaleDebiti: 12000000, patrimonioNetto: 10000000, capitaleSociale: 3000000, utiliPortati: 4800000,
    capitaleDiLavoro: 3300000, utiliNonDistribuiti: 4800000, fatturato: 18500000, valoreAzioneMercato: 15000000, debtService: 1950000,
  },
  5: { // Epsilon S.r.l.
    companyName: 'Epsilon S.r.l.', partitaIva: '55443322110', settore: 'Commercio all\'ingrosso', dataChiusura: '31/12/2025', area_geografica: 'Sud',
    ricavi: 8200000, costiOperativi: 7544000, ebitda: 656000, ebitdaMargin: 8.0, ammortamenti: 180000, ebit: 476000,
    oneriFinanziari: 190000, risultatoLordo: 286000, imposte: 85800, utileNetto: 200200,
    totaleAttivo: 6800000, attivoCorrenti: 4080000, cassa: 320000, crediti: 2500000, rimanenze: 1260000, attivoFisso: 2720000,
    totalePassivo: 6800000, passivoCorrenti: 3740000, debitiVersoBanche: 1800000, debitiBreveTermine: 3740000, debitiLungoTermine: 1060000,
    totaleDebiti: 4800000, patrimonioNetto: 2000000, capitaleSociale: 500000, utiliPortati: 900000,
    capitaleDiLavoro: 340000, utiliNonDistribuiti: 900000, fatturato: 8200000, valoreAzioneMercato: 3000000, debtService: 650000,
  },
  7: { // Eta Holding
    companyName: 'Eta Holding', partitaIva: '22334455667', settore: 'Consulenza gestionale', dataChiusura: '31/12/2025', area_geografica: 'Nord-Est',
    ricavi: 5200000, costiOperativi: 3900000, ebitda: 1300000, ebitdaMargin: 25.0, ammortamenti: 150000, ebit: 1150000,
    oneriFinanziari: 80000, risultatoLordo: 1070000, imposte: 321000, utileNetto: 749000,
    totaleAttivo: 4500000, attivoCorrenti: 2700000, cassa: 850000, crediti: 1500000, rimanenze: 350000, attivoFisso: 1800000,
    totalePassivo: 4500000, passivoCorrenti: 1200000, debitiVersoBanche: 600000, debitiBreveTermine: 1200000, debitiLungoTermine: 800000,
    totaleDebiti: 2000000, patrimonioNetto: 2500000, capitaleSociale: 1000000, utiliPortati: 1200000,
    capitaleDiLavoro: 1500000, utiliNonDistribuiti: 1200000, fatturato: 5200000, valoreAzioneMercato: 3750000, debtService: 280000,
  },
  11: { // Lambda Group
    companyName: 'Lambda Group', partitaIva: '66778800112', settore: 'Costruzione di edifici', dataChiusura: '31/12/2025', area_geografica: 'Centro',
    ricavi: 12000000, costiOperativi: 11040000, ebitda: 960000, ebitdaMargin: 8.0, ammortamenti: 450000, ebit: 510000,
    oneriFinanziari: 380000, risultatoLordo: 130000, imposte: 39000, utileNetto: 91000,
    totaleAttivo: 15000000, attivoCorrenti: 7500000, cassa: 400000, crediti: 4200000, rimanenze: 2900000, attivoFisso: 7500000,
    totalePassivo: 15000000, passivoCorrenti: 6750000, debitiVersoBanche: 5500000, debitiBreveTermine: 6750000, debitiLungoTermine: 4250000,
    totaleDebiti: 11000000, patrimonioNetto: 4000000, capitaleSociale: 1500000, utiliPortati: 1800000,
    capitaleDiLavoro: 750000, utiliNonDistribuiti: 1800000, fatturato: 12000000, valoreAzioneMercato: 6000000, debtService: 1800000,
  },
  15: { // Omicron Digital
    companyName: 'Omicron Digital', partitaIva: '00112244556', settore: 'Software e consulenza informatica', dataChiusura: '31/12/2025', area_geografica: 'Nord-Ovest',
    ricavi: 3800000, costiOperativi: 2850000, ebitda: 950000, ebitdaMargin: 25.0, ammortamenti: 120000, ebit: 830000,
    oneriFinanziari: 45000, risultatoLordo: 785000, imposte: 235500, utileNetto: 549500,
    totaleAttivo: 3200000, attivoCorrenti: 2240000, cassa: 680000, crediti: 1200000, rimanenze: 360000, attivoFisso: 960000,
    totalePassivo: 3200000, passivoCorrenti: 800000, debitiVersoBanche: 350000, debitiBreveTermine: 800000, debitiLungoTermine: 400000,
    totaleDebiti: 1200000, patrimonioNetto: 2000000, capitaleSociale: 500000, utiliPortati: 1100000,
    capitaleDiLavoro: 1440000, utiliNonDistribuiti: 1100000, fatturato: 3800000, valoreAzioneMercato: 3000000, debtService: 200000,
  },
};

// Default demo bilancio (for upload flow without real backend)
const DEFAULT_BILANCIO: ParsedBilancio = DEMO_BILANCI[1];

export interface FullAnalysisResult {
  bilancio: ParsedBilancio;
  riskModels: RiskModelResults;
  pd: number;
  benchmark: BenchmarkComparison;
  narratives: NarrativeModule[];
  financialStatements: FinancialStatements;
  varianceAnalysis: VarianceAnalysisResult;
  anomalies: AnomalyDetectorResult;
  fairnessCheck: FairnessCheckResult;
  auditLog: AuditEntry[];
}

/** Run the full analysis pipeline on a bilancio */
export function runFullAnalysis(companyId?: number, bilancio?: ParsedBilancio): FullAnalysisResult {
  const b = bilancio || (companyId ? DEMO_BILANCI[companyId] : undefined) || DEFAULT_BILANCIO;

  // Step 1: Risk Models
  const riskModels = calculateAllModels(b);
  const pd = estimatePD(riskModels);

  // Step 2: Benchmark
  const benchmark = compareBenchmark(b, riskModels, b.settore);

  // Step 3: Narratives
  const narratives = generateAllNarratives(b, riskModels, benchmark);

  // Step 4: Financial Statements
  const financialStatements = generateFinancialStatements(b);

  // Step 5: Variance Analysis
  const varianceAnalysis = runVarianceAnalysis(b, riskModels, benchmark, pd);

  // Step 6: Anomaly Detection
  const anomalies = detectAnomalies(b, riskModels, benchmark, pd);

  // Step 7: Fairness Check
  const auditEntries = loadAuditLog();
  const fairnessCheck = runFairnessCheck(b, riskModels, narratives, auditEntries, false);

  // Audit: log the analysis
  addAuditEntry('FINANCIAL_STATEMENTS', `Generato bilancio GAAP per ${b.companyName}`, undefined, 'M. Rossi');
  addAuditEntry('VARIANCE_ANALYSIS', `Analisi varianze vs benchmark ${benchmark.settore.codice}`, undefined, 'M. Rossi');
  addAuditEntry('ANOMALY_DETECTION', `Rilevate ${anomalies.summary.total} anomalie (rischio: ${anomalies.summary.overallRisk})`, undefined, 'M. Rossi');
  addAuditEntry('FAIRNESS_CHECK', `EU AI Act compliance: ${fairnessCheck.overallStatus} (${fairnessCheck.score}%)`, undefined, 'M. Rossi');

  const auditLog = loadAuditLog();

  return { bilancio: b, riskModels, pd, benchmark, narratives, financialStatements, varianceAnalysis, anomalies, fairnessCheck, auditLog };
}
