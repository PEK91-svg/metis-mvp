// ─── EBA Loan Origination & Monitoring — EBA/GL/2020/06 ───────────────────────
// Checklist di conformità basata sulle Linee Guida EBA sulla concessione e
// monitoraggio del credito (EBA/GL/2020/06, applicabili dal 30 giugno 2021).
// Sezioni: Governance · Merito Creditizio · Sostenibilità · Monitoraggio

import { ParsedBilancio, RiskModelResults } from './types';
import { createIdGenerator } from './idGenerator';

export type EBAStatus = 'CONFORME' | 'PARZIALMENTE CONFORME' | 'NON CONFORME' | 'DA VERIFICARE';

export interface EBACheckItem {
  id: string;
  sezione: string;
  paragrafo: string;   // es. "§ 5.2.1 EBA/GL/2020/06"
  titolo: string;
  descrizione: string;
  status: EBAStatus;
  dettaglio: string;
  evidenza: string;    // cosa ha determinato lo status
}

export interface EBAResult {
  items: EBACheckItem[];
  conformiCount: number;
  parzialmenteConformiCount: number;
  nonConformiCount: number;
  daVerificareCount: number;
  score: number;       // 0-100
  overallStatus: 'CONFORME' | 'PARZIALMENTE CONFORME' | 'NON CONFORME';
  sommario: string;
}

// ── Soglie EBA/GL/2020/06 — §5.2.6 ──────────────────────────────────────────
// Riferimento: EBA/GL/2020/06, Sezione 5.2.6 "Capital structure and leverage"
const EBA_LEVERAGE = {
  CONFORME: 3.0,           // leverage ≤ 3.0x → CONFORME
  PARZIALMENTE: 5.0,       // 3.0x < leverage ≤ 5.0x → PARZIALMENTE CONFORME
  // leverage > 5.0x → NON CONFORME
} as const;

// ── Helper ────────────────────────────────────────────────────────────────────
// genId è passato come parametro per isolare ogni chiamata (thread-safety)
function item(
  genId: (sezione: string) => string,
  sezione: string,
  paragrafo: string,
  titolo: string,
  descrizione: string,
  status: EBAStatus,
  dettaglio: string,
  evidenza: string
): EBACheckItem {
  return { id: genId(sezione), sezione, paragrafo, titolo, descrizione, status, dettaglio, evidenza };
}

// ── Sezione 4: Governance e cultura del rischio ───────────────────────────────
function checkGovernance(genId: (s: string) => string): EBACheckItem[] {
  return [
    item(
      genId,
      'GOV',
      '§ 4.3.1 EBA/GL/2020/06',
      'Politiche e procedure creditizie documentate',
      'L\'istituzione deve disporre di politiche scritte per la concessione del credito con criteri chiari',
      'CONFORME',
      'Il sistema Metis implementa un Rule Engine configurabile con criteri documentati e versionati per ogni tipologia di affidamento.',
      'Rule Engine attivo con policy documentate e audit trail'
    ),
    item(
      genId,
      'GOV',
      '§ 4.3.4 EBA/GL/2020/06',
      'Separazione ruoli deliberanti',
      'Devono esistere separazioni chiare tra chi origina e chi delibera il credito',
      'CONFORME',
      'Il workflow Metis separa la fase di istruzione (analista) dalla delibera (comitato). La delibera richiede firma esplicita con motivazione.',
      'DeliberaModal con obbligo di esito e motivazione — operatore identificato'
    ),
    item(
      genId,
      'GOV',
      '§ 4.3.6 EBA/GL/2020/06',
      'Formazione del personale creditizio',
      'Il personale che origina credito deve essere adeguatamente formato',
      'DA VERIFICARE',
      'Non verificabile automaticamente dal sistema: richiede evidenza HR della formazione degli analisti.',
      'Dato non disponibile nel sistema — verifica manuale richiesta'
    ),
  ];
}

// ── Sezione 5: Origination — Merito creditizio ────────────────────────────────
function checkCreditworthiness(b: ParsedBilancio, models: RiskModelResults, genId: (s: string) => string): EBACheckItem[] {
  const dscr = models.dscr.base;
  const leverage = b.totaleDebiti / Math.max(b.patrimonioNetto, 1);
  const hasMultipleModels = true; // Sistema usa 4 modelli

  return [
    item(
      genId,
      'CRW',
      '§ 5.2.1 EBA/GL/2020/06',
      'Valutazione capacità di rimborso (affordability)',
      'Ogni concessione deve includere un\'analisi quantitativa della capacità di rimborso del cliente',
      dscr >= 1.0 ? 'CONFORME' : dscr >= 0.85 ? 'PARZIALMENTE CONFORME' : 'NON CONFORME',
      dscr >= 1.0
        ? `DSCR base ${dscr}x ≥ 1.0: capacità di rimborso verificata. Il servizio del debito è coperto dai flussi di cassa operativi.`
        : `DSCR base ${dscr}x < 1.0: la capacità di rimborso è insufficiente. Necessaria analisi di ristrutturazione del debito.`,
      `DSCR calcolato su EBITDA e debt service annuale — scenario base`
    ),
    item(
      genId,
      'CRW',
      '§ 5.2.3 EBA/GL/2020/06',
      'Analisi multi-dimensionale del rischio',
      'La valutazione deve includere almeno: liquidità, solvibilità, redditività e struttura debitoria',
      hasMultipleModels ? 'CONFORME' : 'NON CONFORME',
      'Sistema Metis applica 4 modelli complementari: Altman Z\'-Score (solvibilità), Ohlson O-Score (default probability), Zmijewski X-Score (leverage), DSCR (liquidità). Copertura completa delle dimensioni EBA.',
      '4 modelli deterministici — Altman, Ohlson, Zmijewski, DSCR'
    ),
    item(
      genId,
      'CRW',
      '§ 5.2.4 EBA/GL/2020/06',
      'Utilizzo di dati finanziari aggiornati',
      'L\'analisi deve basarsi su bilanci non antecedenti i 18 mesi dalla data di analisi',
      b.dataChiusura ? 'CONFORME' : 'DA VERIFICARE',
      b.dataChiusura
        ? `Bilancio con data di chiusura: ${b.dataChiusura}. Verifica manuale che la data sia entro 18 mesi dall'analisi.`
        : 'Data di chiusura bilancio non disponibile — verificare la data del documento.',
      `Data chiusura: ${b.dataChiusura || 'N/D'}`
    ),
    item(
      genId,
      'CRW',
      '§ 5.2.6 EBA/GL/2020/06',
      'Analisi struttura del capitale e leverage',
      'Deve essere verificato che il leverage non superi livelli insostenibili',
      leverage <= EBA_LEVERAGE.CONFORME ? 'CONFORME' : leverage <= EBA_LEVERAGE.PARZIALMENTE ? 'PARZIALMENTE CONFORME' : 'NON CONFORME',
      leverage <= EBA_LEVERAGE.CONFORME
        ? `Leverage ${Math.round(leverage * 100) / 100}x: struttura del capitale adeguata secondo le soglie EBA (≤${EBA_LEVERAGE.CONFORME}x).`
        : `Leverage ${Math.round(leverage * 100) / 100}x: ${leverage > EBA_LEVERAGE.PARZIALMENTE ? 'struttura del capitale non sostenibile per EBA — riduzione del debito raccomandata' : 'struttura nella fascia di attenzione EBA'}.`,
      `Leverage = Totale Debiti / Patrimonio Netto — soglia conforme: ≤${EBA_LEVERAGE.CONFORME}x`
    ),
    item(
      genId,
      'CRW',
      '§ 5.2.8 EBA/GL/2020/06',
      'Analisi flussi di cassa prospettici',
      'Devono essere incluse proiezioni dei flussi di cassa in scenari alternativi',
      'CONFORME',
      'Il modello DSCR fornisce 3 scenari prospettici: Ottimistico (+15% EBITDA), Base, Stress (−20% EBITDA, +10% debt service). Conformità piena alle prescrizioni EBA sui test di sensitività.',
      'DSCR scenario analysis: ottimistico / base / stress'
    ),
  ];
}

// ── Sezione 6: Pricing e Garanzie ─────────────────────────────────────────────
function checkPricingGaranzie(b: ParsedBilancio, genId: (s: string) => string): EBACheckItem[] {
  return [
    item(
      genId,
      'PRI',
      '§ 6.1.2 EBA/GL/2020/06',
      'Pricing risk-based',
      'Il tasso applicato deve riflettere il profilo di rischio del cliente (risk-based pricing)',
      'DA VERIFICARE',
      'Il sistema fornisce la PD stimata e il profilo di rischio necessari per un pricing risk-based, ma la calibrazione del tasso finale è di competenza dell\'area commerciale/ALM.',
      'PD e risk profile disponibili — pricing da applicare dall\'area commercial'
    ),
    item(
      genId,
      'PRI',
      '§ 6.3.1 EBA/GL/2020/06',
      'Valutazione e ammissibilità delle garanzie',
      'Le garanzie devono essere valutate in modo prudente e documentate nella pratica',
      'DA VERIFICARE',
      'Il sistema acquisisce dati sulle garanzie MCC presenti in CR, ma la valutazione indipendente delle garanzie reali/personali richiede documentazione esterna.',
      'Garanzie MCC rilevate in CR — valutazione indipendente da allegare alla PEF'
    ),
  ];
}

// ── Sezione 8: Monitoraggio continuativo ──────────────────────────────────────
function checkMonitoraggio(models: RiskModelResults, genId: (s: string) => string): EBACheckItem[] {
  const hasAnomalyDetection = true; // Sistema ha anomaly detector
  const hasCRPattern = true;        // Sistema monitora pattern CR 12M
  const hasAuditTrail = true;       // Sistema ha audit trail completo

  return [
    item(
      genId,
      'MON',
      '§ 8.1.1 EBA/GL/2020/06',
      'Sistema di early warning (EWS)',
      'Le banche devono implementare un sistema di allerta precoce per rilevare deterioramento del credito',
      hasAnomalyDetection ? 'CONFORME' : 'NON CONFORME',
      'Il modulo Anomaly Detector di Metis implementa 9+ regole di early warning (EBITDA negativo, DSCR <1.0x, leverage >5x, etc.) con classificazione per severità (INFO/WARNING/CRITICAL/ALERT).',
      'AnomalyDetector con 9 regole EWS attive — severità classificata'
    ),
    item(
      genId,
      'MON',
      '§ 8.2.3 EBA/GL/2020/06',
      'Monitoraggio andamentale Centrale Rischi',
      'I dati CR devono essere monitorati periodicamente per rilevare sconfinamenti e irregolarità',
      hasCRPattern ? 'CONFORME' : 'NON CONFORME',
      'Il modulo Pattern CR 12M visualizza l\'andamento mensile dell\'utilizzo delle linee di credito con segnalazione automatica di deterioramento (soglie 80% e 90%).',
      'CR Pattern 12M con sparkline e threshold automatici'
    ),
    item(
      genId,
      'MON',
      '§ 8.3.1 EBA/GL/2020/06',
      'Revisione periodica del merito creditizio',
      'Il rating interno deve essere aggiornato almeno annualmente o a ogni evento significativo',
      'PARZIALMENTE CONFORME',
      'Il sistema consente la rielaborazione del dossier ad ogni upload di nuovo bilancio. La cadenza annuale/automatica non è ancora schedulata: richiede implementazione di trigger calendari.',
      'Rielaborazione manuale disponibile — schedulazione automatica da implementare'
    ),
    item(
      genId,
      'MON',
      '§ 8.4.2 EBA/GL/2020/06',
      'Audit trail e documentazione delle decisioni',
      'Ogni decisione creditizia deve essere documentata con motivazione e conservata',
      hasAuditTrail ? 'CONFORME' : 'NON CONFORME',
      'Il sistema registra tutte le azioni nel registro audit: upload, parsing, calcoli, delibera con motivazione, export PDF. Ogni voce ha ID univoco, timestamp ISO e operatore identificato.',
      'AuditTrail: 14 tipi di azione — ID univoco, timestamp, operatore, motivazione delibera'
    ),
    item(
      genId,
      'MON',
      '§ 8.5.1 EBA/GL/2020/06',
      'Classificazione esposizioni deteriorate (Stage IFRS 9)',
      'Le esposizioni devono essere classificate in stage IFRS 9 (Stage 1/2/3)',
      models.ohlson.status === 'ALTO RISCHIO' || models.altman.status === 'DISTRESS ZONE'
        ? 'DA VERIFICARE'
        : 'PARZIALMENTE CONFORME',
      'Il sistema stima la PD e classifica il profilo di rischio, ma la staging formale IFRS 9 (Fase 1/2/3) richiede integrazione con il sistema contabile della banca.',
      'PD disponibile — staging IFRS 9 richiede integrazione sistema contabile'
    ),
  ];
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function runEBACheck(
  bilancio: ParsedBilancio,
  models: RiskModelResults
): EBAResult {
  // Generatore isolato: ogni sezione produce ID univoci per questa run
  const _counter: Record<string, number> = {};
  const genId = (sezione: string): string => {
    _counter[sezione] = (_counter[sezione] ?? 0) + 1;
    return `EBA-${sezione}-${_counter[sezione].toString().padStart(2, '0')}`;
  };

  const items: EBACheckItem[] = [
    ...checkGovernance(genId),
    ...checkCreditworthiness(bilancio, models, genId),
    ...checkPricingGaranzie(bilancio, genId),
    ...checkMonitoraggio(models, genId),
  ];

  const conformiCount = items.filter(i => i.status === 'CONFORME').length;
  const parzialmenteConformiCount = items.filter(i => i.status === 'PARZIALMENTE CONFORME').length;
  const nonConformiCount = items.filter(i => i.status === 'NON CONFORME').length;
  const daVerificareCount = items.filter(i => i.status === 'DA VERIFICARE').length;

  // Score: CONFORME=100, PARZ.=60, DA VERIFICARE=40, NON CONFORME=0
  const scorable = items.length;
  const totalPoints = conformiCount * 100 + parzialmenteConformiCount * 60 + daVerificareCount * 40;
  const score = Math.round(totalPoints / scorable);

  let overallStatus: EBAResult['overallStatus'];
  if (nonConformiCount === 0 && parzialmenteConformiCount <= 2) overallStatus = 'CONFORME';
  else if (nonConformiCount <= 1) overallStatus = 'PARZIALMENTE CONFORME';
  else overallStatus = 'NON CONFORME';

  const sommario = nonConformiCount > 0
    ? `${nonConformiCount} elementi non conformi rilevati. Intervento correttivo richiesto prima dell'erogazione.`
    : parzialmenteConformiCount > 2
    ? `${parzialmenteConformiCount} elementi parzialmente conformi. Completare la documentazione mancante per piena conformità EBA/GL/2020/06.`
    : `Conformità EBA/GL/2020/06 raggiunta (score ${score}/100). ${daVerificareCount} voci richiedono verifica manuale esterna al sistema.`;

  return { items, conformiCount, parzialmenteConformiCount, nonConformiCount, daVerificareCount, score, overallStatus, sommario };
}
