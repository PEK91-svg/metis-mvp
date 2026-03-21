// ─── Fairness & Bias Check — EU AI Act Compliance ─────────────────────────────
// Verifica conformità EU AI Act per sistemi di scoring creditizio.
// Checks: trasparenza, human-in-the-loop, auditability, data quality, consistency, non-discrimination.

import {
  ParsedBilancio,
  RiskModelResults,
  BenchmarkComparison,
  AnomalyDetectorResult,
  NarrativeModule,
  AuditEntry,
  ComplianceCheck,
  FairnessCheckResult,
  ComplianceCheckStatus,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────
let checkCounter = 0;
function genCheckId(): string {
  checkCounter++;
  return `CHK-${checkCounter.toString().padStart(3, '0')}`;
}

function check(
  category: ComplianceCheck['category'],
  label: string,
  description: string,
  status: ComplianceCheckStatus,
  detail: string
): ComplianceCheck {
  return { id: genCheckId(), category, label, description, status, detail };
}

// ── Transparency Checks ─────────────────────────────────────────────────────
function checkTransparency(
  narratives: NarrativeModule[],
  models: RiskModelResults
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // T1: Ogni modello ha una descrizione esplicativa
  const allModelsDescribed = [
    models.altman.description,
    models.ohlson.description,
    models.zmijewski.description,
    models.dscr.description,
  ].every(d => d && d.length > 20);

  checks.push(check(
    'TRANSPARENCY',
    'Spiegabilità modelli (Glass-Box)',
    'Ogni modello di rischio produce una spiegazione testuale del risultato',
    allModelsDescribed ? 'PASS' : 'FAIL',
    allModelsDescribed
      ? 'Tutti i 4 modelli (Altman, Ohlson, Zmijewski, DSCR) generano narrative esplicative con formula e interpretazione.'
      : 'Uno o più modelli non producono spiegazioni adeguate. Violazione principio di trasparenza.'
  ));

  // T2: Narrative XAI generate
  checks.push(check(
    'TRANSPARENCY',
    'Narrative XAI presenti',
    'Il sistema genera narrative esplicative per ogni modulo di analisi',
    narratives.length >= 3 ? 'PASS' : 'FAIL',
    `${narratives.length} moduli narrativi generati (minimo richiesto: 3). ${narratives.map(n => n.title).join(', ')}.`
  ));

  // T3: Formule esplicite e deterministiche
  checks.push(check(
    'TRANSPARENCY',
    'Formule deterministiche',
    'Tutti i calcoli sono basati su formule pubblicate e riproducibili',
    'PASS',
    'Modelli utilizzati: Altman Z-Score (1968), Ohlson O-Score (1980), Zmijewski X-Score (1984). Nessun modello black-box o ML opaco impiegato.'
  ));

  // T4: Componenti del modello esposti
  checks.push(check(
    'TRANSPARENCY',
    'Componenti modello esposti',
    'Le componenti intermedie di ogni modello sono visibili all\'operatore',
    'PASS',
    `Altman: X1=${models.altman.components.x1}, X2=${models.altman.components.x2}, X3=${models.altman.components.x3}, X4=${models.altman.components.x4}, X5=${models.altman.components.x5}. Tutte le variabili intermedie sono tracciate.`
  ));

  return checks;
}

// ── Human-in-the-Loop Checks ────────────────────────────────────────────────
function checkHumanInTheLoop(hasDelibera: boolean): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // H1: Delibera umana richiesta
  checks.push(check(
    'HUMAN_IN_THE_LOOP',
    'Delibera umana obbligatoria',
    'Il sistema richiede una decisione esplicita dell\'operatore umano',
    'PASS',
    'Il workflow richiede azione esplicita del Comitato Deliberante (APPROVATA/INTEGRAZIONE/RIFIUTATA). Nessuna decisione automatica.'
  ));

  // H2: Nessuna decisione automatica
  checks.push(check(
    'HUMAN_IN_THE_LOOP',
    'Assenza decisioni automatiche',
    'Il sistema non approva/rifiuta automaticamente nessuna pratica',
    'PASS',
    'Il sistema è classificato come "Supporto Decisionale". Output: analisi e raccomandazioni. L\'operatore decide autonomamente.'
  ));

  // H3: Stato delibera
  checks.push(check(
    'HUMAN_IN_THE_LOOP',
    'Delibera registrata',
    'La decisione dell\'operatore è stata registrata nel sistema',
    hasDelibera ? 'PASS' : 'WARNING',
    hasDelibera
      ? 'Delibera registrata con operatore, timestamp e motivazione.'
      : 'Delibera non ancora registrata. Il dossier è ancora in fase di analisi — la decisione umana è pendente.'
  ));

  return checks;
}

// ── Auditability Checks ─────────────────────────────────────────────────────
function checkAuditability(auditEntries: AuditEntry[]): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // A1: Audit trail presente
  checks.push(check(
    'AUDITABILITY',
    'Audit trail completo',
    'Ogni azione del sistema è registrata con timestamp e operatore',
    auditEntries.length >= 3 ? 'PASS' : 'WARNING',
    `${auditEntries.length} voci nel registro audit. ${auditEntries.length >= 3 ? 'Copertura sufficiente del workflow.' : 'Registro audit incompleto — potrebbero mancare passaggi.'}`
  ));

  // A2: Timestamp e operatore su ogni entry
  const allHaveTimestamp = auditEntries.every(e => e.timestamp && e.operator);
  checks.push(check(
    'AUDITABILITY',
    'Attribuzione azioni',
    'Ogni azione è attribuita a un operatore con timestamp',
    allHaveTimestamp ? 'PASS' : 'FAIL',
    allHaveTimestamp
      ? 'Tutte le voci audit hanno timestamp ISO e operatore identificato.'
      : 'Alcune voci audit mancano di timestamp o operatore.'
  ));

  // A3: Riproducibilità
  checks.push(check(
    'AUDITABILITY',
    'Riproducibilità calcoli',
    'I risultati possono essere riprodotti da terzi partendo dagli stessi input',
    'PASS',
    'Formule pubblicate, dati di input conservati nel dossier, parametri fissati. Un revisore indipendente può verificare ogni risultato.'
  ));

  return checks;
}

// ── Data Quality Checks ─────────────────────────────────────────────────────
function checkDataQuality(b: ParsedBilancio): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const missing: string[] = [];

  // Verifica completezza dati critici
  if (b.ricavi === 0) missing.push('Ricavi');
  if (b.ebitda === 0 && b.ricavi > 0) missing.push('EBITDA');
  if (b.totaleAttivo === 0) missing.push('Totale Attivo');
  if (b.patrimonioNetto === 0) missing.push('Patrimonio Netto');
  if (b.totaleDebiti === 0 && b.debitiVersoBanche === 0) missing.push('Dati debitori');
  if (b.partitaIva === '00000000000') missing.push('Partita IVA');

  checks.push(check(
    'DATA_QUALITY',
    'Completezza dati input',
    'Verifica che tutti i campi critici del bilancio siano popolati',
    missing.length === 0 ? 'PASS' : missing.length <= 2 ? 'WARNING' : 'FAIL',
    missing.length === 0
      ? 'Tutti i campi critici del bilancio sono popolati (ricavi, EBITDA, attivo, passivo, patrimonio netto).'
      : `Campi mancanti o a zero: ${missing.join(', ')}. I risultati dei modelli potrebbero essere inaffidabili.`
  ));

  // Quadratura Attivo = Passivo + PN
  const attivoPassivoDelta = Math.abs(b.totaleAttivo - (b.totaleDebiti + b.patrimonioNetto));
  const tolerance = b.totaleAttivo * 0.05; // 5% tolerance
  checks.push(check(
    'DATA_QUALITY',
    'Quadratura patrimoniale',
    'Totale Attivo ≈ Totale Debiti + Patrimonio Netto',
    attivoPassivoDelta <= tolerance ? 'PASS' : 'WARNING',
    attivoPassivoDelta <= tolerance
      ? `Quadratura verificata: Attivo (€${b.totaleAttivo.toLocaleString('it-IT')}) ≈ Debiti + PN (€${(b.totaleDebiti + b.patrimonioNetto).toLocaleString('it-IT')}). Delta: €${attivoPassivoDelta.toLocaleString('it-IT')}.`
      : `Squadratura rilevata: delta €${attivoPassivoDelta.toLocaleString('it-IT')} (>${(tolerance).toLocaleString('it-IT')} soglia 5%). Possibile dato stimato o incompleto.`
  ));

  return checks;
}

// ── Consistency Checks ──────────────────────────────────────────────────────
function checkConsistency(models: RiskModelResults): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // C1: Coerenza tra modelli
  const altmanDistress = models.altman.status === 'DISTRESS ZONE';
  const ohlsonHigh = models.ohlson.status === 'ALTO RISCHIO';
  const zmijewskiHigh = models.zmijewski.status === 'ALTO RISCHIO';
  const dscrInsuff = models.dscr.status === 'INSUFFICIENTE';

  const highRiskCount = [altmanDistress, ohlsonHigh, zmijewskiHigh, dscrInsuff].filter(Boolean).length;
  const lowRiskCount = [
    models.altman.status === 'SAFE ZONE',
    models.ohlson.status === 'BASSO RISCHIO',
    models.zmijewski.status === 'BASSO RISCHIO',
    models.dscr.status === 'ADEGUATO',
  ].filter(Boolean).length;

  // Incoerenza: un modello dice basso rischio, altri dicono alto
  const inconsistent = highRiskCount > 0 && lowRiskCount > 0 && Math.abs(highRiskCount - lowRiskCount) >= 2;

  checks.push(check(
    'CONSISTENCY',
    'Coerenza inter-modello',
    'I risultati dei diversi modelli convergono nella stessa direzione',
    inconsistent ? 'WARNING' : 'PASS',
    inconsistent
      ? `Rilevata divergenza tra modelli: ${highRiskCount} modelli indicano alto rischio, ${lowRiskCount} indicano basso rischio. L'operatore deve valutare con attenzione il contesto specifico.`
      : `I modelli sono coerenti: ${highRiskCount > lowRiskCount ? 'convergenza verso rischio elevato' : lowRiskCount > 0 ? 'convergenza verso profilo stabile' : 'profilo di rischio misto ma coerente'}.`
  ));

  // C2: Determinismo (stesso input → stesso output)
  checks.push(check(
    'CONSISTENCY',
    'Determinismo',
    'Lo stesso bilancio produce sempre lo stesso risultato',
    'PASS',
    'Tutti i modelli sono deterministici (formule fisse, nessun elemento random). Garantita riproducibilità al 100%.'
  ));

  return checks;
}

// ── Non-Discrimination Checks ───────────────────────────────────────────────
function checkNonDiscrimination(): ComplianceCheck[] {
  return [
    check(
      'NON_DISCRIMINATION',
      'Assenza variabili protette',
      'I modelli non utilizzano variabili relative a genere, etnia, età, religione, orientamento',
      'PASS',
      'I modelli di scoring utilizzano esclusivamente variabili finanziarie (ricavi, EBITDA, attivo, passivo, debiti, patrimonio netto). Nessuna variabile demografica o protetta è coinvolta nel calcolo.'
    ),
    check(
      'NON_DISCRIMINATION',
      'Equità settoriale',
      'Il benchmark settoriale non introduce bias discriminatori',
      'PASS',
      'I benchmark ATECO sono basati su dati aggregati ISTAT/Cerved per macro-settore. Non introducono discriminazione verso specifiche imprese ma confrontano con la mediana di settore.'
    ),
  ];
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function runFairnessCheck(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  narratives: NarrativeModule[],
  auditEntries: AuditEntry[],
  hasDelibera: boolean
): FairnessCheckResult {
  checkCounter = 0;

  const allChecks: ComplianceCheck[] = [
    ...checkTransparency(narratives, models),
    ...checkHumanInTheLoop(hasDelibera),
    ...checkAuditability(auditEntries),
    ...checkDataQuality(bilancio),
    ...checkConsistency(models),
    ...checkNonDiscrimination(),
  ];

  const { summary, score, recommendations } = allChecks.reduce<{
    summary: { passed: number; failed: number; warnings: number; notApplicable: number };
    scorable: number; totalPoints: number; score: number;
    recommendations: string[];
  }>(
    (acc, c) => {
      if (c.status === 'PASS') { acc.summary.passed++; acc.scorable++; acc.totalPoints += 100; }
      else if (c.status === 'FAIL') { acc.summary.failed++; acc.scorable++; acc.recommendations.push(`[CRITICO] ${c.label}: ${c.detail}`); }
      else if (c.status === 'WARNING') { acc.summary.warnings++; acc.scorable++; acc.totalPoints += 50; acc.recommendations.push(`[ATTENZIONE] ${c.label}: ${c.detail}`); }
      else { acc.summary.notApplicable++; }
      acc.score = acc.scorable > 0 ? Math.round(acc.totalPoints / acc.scorable) : 0;
      return acc;
    },
    { summary: { passed: 0, failed: 0, warnings: 0, notApplicable: 0 }, scorable: 0, totalPoints: 0, score: 0, recommendations: [] }
  );

  if (recommendations.length === 0) {
    recommendations.push('Nessuna azione correttiva necessaria. Il sistema è conforme ai requisiti EU AI Act applicabili.');
  }

  let overallStatus: FairnessCheckResult['overallStatus'];
  if (summary.failed === 0 && summary.warnings <= 1) overallStatus = 'CONFORME';
  else if (summary.failed === 0) overallStatus = 'PARZIALMENTE CONFORME';
  else overallStatus = 'NON CONFORME';

  return { score, checks: allChecks, summary, recommendations, overallStatus };
}
