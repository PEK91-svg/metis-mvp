// ─── Metis MVP — Shared Types ─────────────────────────────────────────────────

// ── Bilancio Parsed Data ──────────────────────────────────────────────────────
export interface ParsedBilancio {
  companyName: string;
  partitaIva: string;
  settore: string;
  dataChiusura: string; // es. "31/12/2025"

  // Conto Economico
  ricavi: number;
  costiOperativi: number;
  ebitda: number;
  ebitdaMargin: number; // percentuale
  ammortamenti: number;
  ebit: number;
  oneriFinanziari: number;
  risultatoLordo: number;
  imposte: number;
  utileNetto: number;

  // Stato Patrimoniale — Attivo
  totaleAttivo: number;
  attivoCorrenti: number;
  cassa: number;
  crediti: number;
  rimanenze: number;
  attivoFisso: number;

  // Stato Patrimoniale — Passivo
  totalePassivo: number;
  passivoCorrenti: number;
  debitiVersoBanche: number;
  debitiBreveTermine: number;
  debitiLungoTermine: number;
  totaleDebiti: number;
  patrimonioNetto: number;
  capitaleSociale: number;
  utiliPortati: number;

  // Parametri aggiuntivi per modelli
  capitaleDiLavoro: number; // Working Capital = AC - PC
  utiliNonDistribuiti: number; // Retained Earnings
  fatturato: number; // Alias ricavi
  valoreAzioneMercato: number; // Market Value Equity (stimato)
  debtService: number; // Servizio debito annuale (rate + interessi)
}

// ── Risk Model Results ────────────────────────────────────────────────────────
export interface AltmanResult {
  score: number;
  status: 'SAFE ZONE' | 'GREY ZONE' | 'DISTRESS ZONE';
  components: {
    x1: number; // Working Capital / Total Assets
    x2: number; // Retained Earnings / Total Assets
    x3: number; // EBIT / Total Assets
    x4: number; // Market Value Equity / Total Liabilities
    x5: number; // Sales / Total Assets
  };
  description: string;
}

export interface OhlsonResult {
  score: number;
  probability: number; // O-Score → probabilità
  status: 'BASSO RISCHIO' | 'RISCHIO MODERATO' | 'ALTO RISCHIO';
  components: {
    size: number;
    tlta: number;
    wcta: number;
    clca: number;
    oeneg: number;
    nita: number;
    ffotl: number;
    intwo: number;
    chin: number;
  };
  description: string;
}

export interface ZmijewskiResult {
  score: number;
  probability: number;
  status: 'BASSO RISCHIO' | 'RISCHIO MODERATO' | 'ALTO RISCHIO';
  components: {
    roe: number; // NI/TA
    leverage: number; // TL/TA
    liquidity: number; // CA/CL
  };
  description: string;
}

export interface DSCRResult {
  base: number;
  ottimistico: number;
  stress: number;
  status: 'ADEGUATO' | 'MARGINALE' | 'INSUFFICIENTE';
  scenarioSelezionato: 'BASE' | 'STRESS' | 'OTTIMISTICO';
  description: string;
}

export interface RiskModelResults {
  altman: AltmanResult;
  ohlson: OhlsonResult;
  zmijewski: ZmijewskiResult;
  dscr: DSCRResult;
}

// ── SWOT Analysis ─────────────────────────────────────────────────────────────
export interface SWOTMatrix {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// ── ATECO Benchmark ───────────────────────────────────────────────────────────
export interface ATECOBenchmark {
  codice: string;
  descrizione: string;
  ebitdaMarginMedia: number;
  dscrMedia: number;
  altmanMedia: number;
  leverageMedia: number; // Debiti/PN
  pdMedia: number;
  roiMedia: number;
  currentRatioMedia: number;
}

export interface BenchmarkComparison {
  settore: ATECOBenchmark;
  confronto: {
    ebitdaMargin: { azienda: number; settore: number; delta: number; posizione: 'SOPRA MEDIA' | 'SOTTO MEDIA' | 'IN MEDIA' };
    dscr: { azienda: number; settore: number; delta: number; posizione: 'SOPRA MEDIA' | 'SOTTO MEDIA' | 'IN MEDIA' };
    altman: { azienda: number; settore: number; delta: number; posizione: 'SOPRA MEDIA' | 'SOTTO MEDIA' | 'IN MEDIA' };
    leverage: { azienda: number; settore: number; delta: number; posizione: 'SOPRA MEDIA' | 'SOTTO MEDIA' | 'IN MEDIA' };
  };
  posizioneComplessiva: 'SOPRA MEDIA' | 'SOTTO MEDIA' | 'IN MEDIA';
}

// ── XAI Narrative ─────────────────────────────────────────────────────────────
export interface NarrativeModule {
  agent: string;
  title: string;
  color: 'purple' | 'yellow' | 'cyan' | 'green' | 'red';
  text: string;
}

// ── Audit Trail ───────────────────────────────────────────────────────────────
export type AuditAction =
  | 'UPLOAD_FILE'
  | 'PARSE_BILANCIO'
  | 'CALCOLO_MODELLI'
  | 'GENERAZIONE_NARRATIVE'
  | 'BENCHMARK_CONFRONTO'
  | 'DELIBERA_APPROVATA'
  | 'DELIBERA_INTEGRAZIONE'
  | 'DELIBERA_RIFIUTATA'
  | 'EXPORT_PDF'
  | 'DOSSIER_CREATO'
  | 'DOSSIER_AGGIORNATO'
  | 'FINANCIAL_STATEMENTS'
  | 'VARIANCE_ANALYSIS'
  | 'ANOMALY_DETECTION'
  | 'FAIRNESS_CHECK';

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO string
  action: AuditAction;
  operator: string;
  details: string;
  dossierId?: string;
  metadata?: Record<string, unknown>;
}

// ── Delibera ──────────────────────────────────────────────────────────────────
export type DeliberaEsito = 'APPROVATA' | 'INTEGRAZIONE' | 'RIFIUTATA';

export interface Delibera {
  id: string;
  dossierId: string;
  companyName: string;
  esito: DeliberaEsito;
  motivazione: string;
  operatore: string;
  timestamp: string; // ISO string
  riskSummary: {
    altmanScore: number;
    altmanStatus: string;
    dscrBase: number;
    pd: number;
  };
}

// ── Dossier (full analysis result) ────────────────────────────────────────────
export interface Dossier {
  id: string;
  companyName: string;
  partitaIva: string;
  settore: string;
  createdAt: string;
  updatedAt: string;
  operatore: string;
  status: 'IN ANALISI' | 'APPROVATA' | 'DA REVISIONARE' | 'SOSPESA' | 'RIFIUTATA';
  bilancio: ParsedBilancio;
  riskModels: RiskModelResults;
  swot: SWOTMatrix;
  benchmark: BenchmarkComparison;
  narratives: NarrativeModule[];
  delibera?: Delibera;
  financialStatements?: FinancialStatements;
  varianceAnalysis?: VarianceAnalysisResult;
  anomalies?: AnomalyDetectorResult;
  fairnessCheck?: FairnessCheckResult;
  auditLog: AuditEntry[];
}

// ── Financial Statements ─────────────────────────────────────────────────────
export interface FinancialLineItem {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  note?: string;
}

export interface IncomeStatement {
  periodo: string;
  lines: FinancialLineItem[];
  margins: {
    gross: number;      // (Ricavi - CostiOperativi) / Ricavi
    operating: number;  // EBIT / Ricavi
    net: number;        // Utile Netto / Ricavi
    ebitda: number;     // EBITDA / Ricavi
  };
}

export interface BalanceSheet {
  periodo: string;
  attivo: FinancialLineItem[];
  passivo: FinancialLineItem[];
}

export interface CashFlowStatement {
  periodo: string;
  operativo: FinancialLineItem[];
  investimento: FinancialLineItem[];
  finanziamento: FinancialLineItem[];
  totale: number;
}

export interface FinancialStatements {
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlowStatement;
}

// ── Variance Analysis ────────────────────────────────────────────────────────
export type VarianceClassification = 'FAVOREVOLE' | 'SFAVOREVOLE' | 'NEUTRALE';

export interface VarianceItem {
  kpi: string;
  azienda: number;
  riferimento: number;
  riferimentoLabel: string; // "Benchmark ATECO C25" o "Soglia di rischio"
  delta: number;
  deltaPercent: number;
  classificazione: VarianceClassification;
  narrativa: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface WaterfallItem {
  label: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
  color: string;
}

export interface VarianceAnalysisResult {
  vsBenchmark: VarianceItem[];
  vsSoglie: VarianceItem[];
  waterfall: WaterfallItem[];
  summaryNarrative: string;
}

// ── Anomaly Detector ─────────────────────────────────────────────────────────
export type AnomalySeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';

export interface Anomaly {
  id: string;
  kpi: string;
  severity: AnomalySeverity;
  type: 'ZSCORE' | 'RULE' | 'TREND';
  title: string;
  description: string;
  value: number;
  threshold?: number;
  zScore?: number;
  source: string; // quale dato ha generato l'anomalia (XAI traceability)
}

export interface AnomalyDetectorResult {
  anomalies: Anomaly[];
  summary: {
    total: number;
    byLevel: Record<AnomalySeverity, number>;
    overallRisk: 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  };
}

// ── Fairness & Bias Check (EU AI Act) ────────────────────────────────────────
export type ComplianceCheckStatus = 'PASS' | 'FAIL' | 'WARNING' | 'N/A';

export interface ComplianceCheck {
  id: string;
  category: 'TRANSPARENCY' | 'HUMAN_IN_THE_LOOP' | 'AUDITABILITY' | 'DATA_QUALITY' | 'CONSISTENCY' | 'NON_DISCRIMINATION';
  label: string;
  description: string;
  status: ComplianceCheckStatus;
  detail: string;
}

export interface FairnessCheckResult {
  score: number; // 0-100
  checks: ComplianceCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    notApplicable: number;
  };
  recommendations: string[];
  overallStatus: 'CONFORME' | 'PARZIALMENTE CONFORME' | 'NON CONFORME';
}

// ── Pratica (summary for Home list) ───────────────────────────────────────────
export interface Pratica {
  id: string;
  name: string;
  piva: string;
  pd: number;
  altman: number;
  status: Dossier['status'];
  risk: 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  operator: string;
  updated: string;
  created: string;
  sector: string;
  revenue: number;
  dossierId: string;
}
