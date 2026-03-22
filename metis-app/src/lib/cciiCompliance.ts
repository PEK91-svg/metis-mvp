// ─── Codice della Crisi d'Impresa e dell'Insolvenza — D.Lgs. 14/2019 ──────────
// Mappatura degli indicatori di crisi previsti dalla normativa italiana.
// Riferimenti: Art. 3, Art. 12, Art. 13 D.Lgs. 14/2019 e Principi CNDCEC (2022).

import { ParsedBilancio, RiskModelResults } from './types';
import { createIdGenerator } from './idGenerator';

export type CCIIStatus = 'PASS' | 'WARNING' | 'ALERT' | 'N/A';

export interface CCIIIndicator {
  id: string;
  articolo: string;       // es. "Art. 3 co. 3 D.Lgs. 14/2019"
  riferimento: string;    // descrizione breve della norma
  nome: string;
  descrizione: string;
  valore: number | null;
  soglia: number | null;
  unita: string;
  status: CCIIStatus;
  dettaglio: string;
  fonte: string;          // fonte del dato
}

export interface CCIIResult {
  indicators: CCIIIndicator[];
  alertCount: number;
  warningCount: number;
  passCount: number;
  overallStatus: 'REGOLARE' | 'ATTENZIONE' | 'CRISI PROBABILE';
  hasSegnaliPrecrisi: boolean;
  note: string;
}

// ── Soglie normative ──────────────────────────────────────────────────────────
const SOGLIE = {
  ONERI_FINANZIARI_PCT: 4.0,        // % oneri/ricavi — soglia CNDCEC (Art. 13)
  LEVERAGE_ALERT_FACTOR: 1.25,      // leverage > soglia * 1.25 = ALERT
  LEVERAGE_BASE: 4.0,               // leverage > 4x = WARNING (Art. 3 CCII)
  CASH_FLOW_RATIO_PCT: 8.0,         // FCO/debiti < 8% = ALERT CNDCEC
  CASH_FLOW_RATIO_HALF: 0.5,        // moltiplicatore sotto-soglia per ALERT
} as const;

// ── Calcolo indicatori ────────────────────────────────────────────────────────
// genId è passato come argomento per isolare ogni run (thread-safety)

/**
 * CCII-01 — Patrimonio Netto
 * Art. 2 co. 1 lett. a) e Art. 3 D.Lgs. 14/2019
 * Patrimonio netto negativo o inferiore al minimo legale = segnale di allerta immediato
 */
function checkPatrimonioNetto(b: ParsedBilancio, genId: () => string): CCIIIndicator {
  const pn = b.patrimonioNetto;
  let status: CCIIStatus;
  let dettaglio: string;

  if (pn <= 0) {
    status = 'ALERT';
    dettaglio = `Patrimonio netto negativo (€${pn.toLocaleString('it-IT')}). Obbligo immediato di ricapitalizzazione ai sensi Art. 2446/2447 c.c. La perdita ha intaccato oltre il terzo del capitale sociale.`;
  } else if (pn < b.capitaleSociale * 0.33) {
    status = 'WARNING';
    dettaglio = `Patrimonio netto ridotto (€${pn.toLocaleString('it-IT')}). Attenzione: riserve quasi esaurite. Monitorare evoluzione perdite per evitare il superamento della soglia ex Art. 2446 c.c.`;
  } else {
    status = 'PASS';
    dettaglio = `Patrimonio netto adeguato (€${pn.toLocaleString('it-IT')}). Nessun obbligo di ricapitalizzazione ai sensi del codice civile.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 3 co. 3 lett. a) D.Lgs. 14/2019',
    riferimento: 'Adeguati assetti — sostenibilità del debito',
    nome: 'Patrimonio Netto',
    descrizione: 'Verifica che il patrimonio netto sia positivo e superiore al minimo legale',
    valore: pn,
    soglia: 0,
    unita: '€',
    status,
    dettaglio,
    fonte: 'Stato Patrimoniale — Passivo',
  };
}

/**
 * CCII-02 — DSCR Prospettico 6 mesi
 * Art. 13 D.Lgs. 14/2019 e Elaborazione CNDCEC (2022)
 * Il DSCR a 6 mesi è il primo indicatore della lista CNDCEC
 */
function checkDSCRProspettico(models: RiskModelResults, genId: () => string): CCIIIndicator {
  const dscr6m = models.dscr.stress; // proxy conservativo per 6 mesi
  let status: CCIIStatus;
  let dettaglio: string;

  if (dscr6m < 1.0) {
    status = 'ALERT';
    dettaglio = `DSCR prospettico ${dscr6m}x < 1.0: l'azienda non è in grado di coprire il servizio del debito nei prossimi 6 mesi. Indicatore di crisi ai sensi Art. 13 CCII.`;
  } else if (dscr6m < 1.1) {
    status = 'WARNING';
    dettaglio = `DSCR prospettico ${dscr6m}x nella fascia di attenzione (1.0–1.1). Margine di sicurezza ridotto. Monitoraggio mensile raccomandato.`;
  } else {
    status = 'PASS';
    dettaglio = `DSCR prospettico ${dscr6m}x ≥ 1.1. Capacità di servizio del debito adeguata nel breve termine.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 13 co. 1 D.Lgs. 14/2019',
    riferimento: 'Indicatori della crisi — DSCR a 6 mesi (CNDCEC 2022)',
    nome: 'DSCR Prospettico 6M',
    descrizione: 'Debt Service Coverage Ratio prospettico semestrale — primo indicatore CNDCEC',
    valore: dscr6m,
    soglia: 1.0,
    unita: 'x',
    status,
    dettaglio,
    fonte: 'Calcolo DSCR — scenario stress (proxy 6M)',
  };
}

/**
 * CCII-03 — Oneri Finanziari su Ricavi
 * Art. 13 D.Lgs. 14/2019 — Indici CNDCEC settoriali
 * Soglia: >5% per manifatturiero, >3% per servizi (valore sintetico: 4%)
 */
function checkOneriFinanziari(b: ParsedBilancio, genId: () => string): CCIIIndicator {
  const ricavi = b.ricavi || 1;
  const ratio = (b.oneriFinanziari / ricavi) * 100;
  const ratioRounded = Math.round(ratio * 100) / 100;
  const soglia = SOGLIE.ONERI_FINANZIARI_PCT;
  let status: CCIIStatus;
  let dettaglio: string;

  if (ratioRounded > soglia * 1.5) {
    status = 'ALERT';
    dettaglio = `Oneri finanziari/Ricavi = ${ratioRounded}% (soglia CNDCEC: ${soglia}%). Peso del debito critico: l'azienda destina una quota eccessiva dei ricavi al servizio degli interessi.`;
  } else if (ratioRounded > soglia) {
    status = 'WARNING';
    dettaglio = `Oneri finanziari/Ricavi = ${ratioRounded}% (soglia CNDCEC: ${soglia}%). Monitorare il costo del debito — la soglia è superata.`;
  } else {
    status = 'PASS';
    dettaglio = `Oneri finanziari/Ricavi = ${ratioRounded}% nella norma (soglia CNDCEC: ${soglia}%). Costo del debito sostenibile rispetto al fatturato.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 13 co. 1 D.Lgs. 14/2019',
    riferimento: 'Indicatori della crisi — Indici CNDCEC (OF/Ricavi)',
    nome: 'Oneri Finanziari / Ricavi',
    descrizione: 'Incidenza degli oneri finanziari sul fatturato — indice CNDCEC',
    valore: ratioRounded,
    soglia,
    unita: '%',
    status,
    dettaglio,
    fonte: 'Conto Economico — Oneri finanziari e Ricavi',
  };
}

/**
 * CCII-04 — Indice di Liquidità (Current Ratio)
 * Art. 3 co. 3 D.Lgs. 14/2019 — Adeguati assetti: sostenibilità breve termine
 * Soglia: <1.0 = allerta, 1.0–1.2 = attenzione
 */
function checkLiquidita(b: ParsedBilancio, genId: () => string): CCIIIndicator {
  const ac = b.attivoCorrenti || 0;
  const pc = b.passivoCorrenti || 1;
  const ratio = Math.round((ac / pc) * 100) / 100;
  let status: CCIIStatus;
  let dettaglio: string;

  if (ratio < 1.0) {
    status = 'ALERT';
    dettaglio = `Current ratio ${ratio}x < 1.0: le passività correnti superano le attività correnti. Tensione di liquidità nel breve termine compatibile con stato di crisi ai sensi Art. 3 CCII.`;
  } else if (ratio < 1.2) {
    status = 'WARNING';
    dettaglio = `Current ratio ${ratio}x nella fascia di attenzione (1.0–1.2). Margine di liquidità ridotto. Monitorare scadenze a breve termine.`;
  } else {
    status = 'PASS';
    dettaglio = `Current ratio ${ratio}x adeguato. Copertura delle passività correnti con attivi liquidi sufficiente.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 3 co. 3 D.Lgs. 14/2019',
    riferimento: 'Adeguati assetti — liquidità breve termine',
    nome: 'Indice di Liquidità (CR)',
    descrizione: 'Current Ratio: Attivo Corrente / Passivo Corrente',
    valore: ratio,
    soglia: 1.0,
    unita: 'x',
    status,
    dettaglio,
    fonte: 'Stato Patrimoniale — Attivo e Passivo Corrente',
  };
}

/**
 * CCII-05 — Indebitamento / Patrimonio Netto (Leverage)
 * Art. 3 co. 3 D.Lgs. 14/2019 — struttura finanziaria
 * Soglia: leverage >4x segnale di struttura insostenibile
 */
function checkLeverage(b: ParsedBilancio, genId: () => string): CCIIIndicator {
  const pn = Math.max(b.patrimonioNetto, 1);
  const leverage = Math.round((b.totaleDebiti / pn) * 100) / 100;
  const soglia = SOGLIE.LEVERAGE_BASE;
  let status: CCIIStatus;
  let dettaglio: string;

  if (leverage > soglia * SOGLIE.LEVERAGE_ALERT_FACTOR) {
    status = 'ALERT';
    dettaglio = `Leverage ${leverage}x: la struttura debitoria è critica (>${soglia * SOGLIE.LEVERAGE_ALERT_FACTOR}x). Dipendenza dal debito esterno insostenibile ai sensi degli adeguati assetti Art. 3 CCII.`;
  } else if (leverage > soglia) {
    status = 'WARNING';
    dettaglio = `Leverage ${leverage}x supera la soglia di attenzione (${soglia}x). Struttura finanziaria tesa — valutare piano di riduzione del debito.`;
  } else {
    status = 'PASS';
    dettaglio = `Leverage ${leverage}x entro limiti accettabili (soglia ${soglia}x). Struttura finanziaria bilanciata.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 3 co. 3 lett. b) D.Lgs. 14/2019',
    riferimento: 'Adeguati assetti — struttura finanziaria sostenibile',
    nome: 'Leverage (D/PN)',
    descrizione: 'Rapporto Totale Debiti / Patrimonio Netto',
    valore: leverage,
    soglia,
    unita: 'x',
    status,
    dettaglio,
    fonte: 'Stato Patrimoniale',
  };
}

/**
 * CCII-06 — Flusso di Cassa Operativo / Totale Debiti
 * Art. 13 D.Lgs. 14/2019 — Indicatori CNDCEC: Cash Flow Ratio
 * Soglia: <8% = allerta secondo CNDCEC
 */
function checkCashFlowRatio(b: ParsedBilancio, genId: () => string): CCIIIndicator {
  // FCO proxy (metodo indiretto semplificato): NI + ammortamenti
  // Più preciso di EBITDA - imposte perché include l'effetto degli oneri finanziari
  // e del carico fiscale effettivo. ΔWC non disponibile (richiederebbe bilancio comparato).
  const fco = b.utileNetto + b.ammortamenti;
  const td = b.totaleDebiti || 1;
  const ratio = Math.round((fco / td) * 10000) / 100;
  const soglia = SOGLIE.CASH_FLOW_RATIO_PCT;
  let status: CCIIStatus;
  let dettaglio: string;

  if (ratio < soglia * SOGLIE.CASH_FLOW_RATIO_HALF) {
    status = 'ALERT';
    dettaglio = `Cash Flow / Debiti = ${ratio}% (soglia CNDCEC: ${soglia}%). Capacità di rimborso del debito con il flusso operativo del tutto insufficiente.`;
  } else if (ratio < soglia) {
    status = 'WARNING';
    dettaglio = `Cash Flow / Debiti = ${ratio}% sotto la soglia CNDCEC del ${soglia}%. La generazione di cassa operativo non copre adeguatamente il debito totale.`;
  } else {
    status = 'PASS';
    dettaglio = `Cash Flow / Debiti = ${ratio}% ≥ ${soglia}%. Capacità di rimborso del debito con flusso operativo adeguata secondo CNDCEC.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 13 co. 1 D.Lgs. 14/2019',
    riferimento: 'Indicatori della crisi — CF/Debiti (CNDCEC 2022)',
    nome: 'Cash Flow / Totale Debiti',
    descrizione: 'Indice di copertura del debito con flusso di cassa operativo — indice CNDCEC',
    valore: ratio,
    soglia,
    unita: '%',
    status,
    dettaglio,
    fonte: 'Conto Economico (NI + Ammortamenti) / Stato Patrimoniale — metodo indiretto semplificato',
  };
}

/**
 * CCII-07 — Continuità Aziendale (Going Concern)
 * Art. 3 co. 2 e Art. 12 D.Lgs. 14/2019
 * Combinazione Z-Score + DSCR per valutare il going concern
 */
function checkGoingConcern(models: RiskModelResults, genId: () => string): CCIIIndicator {
  const zScore = models.altman.score;
  const dscrBase = models.dscr.base;
  const inDistress = models.altman.status === 'DISTRESS ZONE';
  const dscrInsufficiente = dscrBase < 1.0;

  let status: CCIIStatus;
  let dettaglio: string;

  if (inDistress && dscrInsufficiente) {
    status = 'ALERT';
    dettaglio = `Convergenza critica: Z-Score in distress zone (${zScore}) e DSCR insufficiente (${dscrBase}x). Presupposti di continuità aziendale a rischio — obbligo di disclosure ex Art. 12 CCII e ISA 570.`;
  } else if (inDistress || dscrInsufficiente) {
    status = 'WARNING';
    dettaglio = `Segnali di attenzione: ${inDistress ? `Z-Score in zona grigia/distress (${zScore})` : `DSCR marginale (${dscrBase}x)`}. Monitorare continuità aziendale ai sensi Art. 3 CCII.`;
  } else {
    status = 'PASS';
    dettaglio = `Nessun segnale critico per la continuità aziendale. Z-Score ${zScore} e DSCR ${dscrBase}x compatibili con operatività ordinaria.`;
  }

  return {
    id: genId(),
    articolo: 'Art. 3 co. 2 e Art. 12 D.Lgs. 14/2019',
    riferimento: 'Adeguati assetti — continuità aziendale (going concern)',
    nome: 'Continuità Aziendale',
    descrizione: 'Valutazione combinata going concern (Altman Z + DSCR)',
    valore: null,
    soglia: null,
    unita: '',
    status,
    dettaglio,
    fonte: 'Modelli Altman Z\'-Score e DSCR',
  };
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function runCCIICheck(
  bilancio: ParsedBilancio,
  models: RiskModelResults
): CCIIResult {
  // Generatore isolato: ogni chiamata ha il proprio contatore → no collisioni
  const genId = createIdGenerator('CCII');

  const indicators: CCIIIndicator[] = [
    checkPatrimonioNetto(bilancio, genId),
    checkDSCRProspettico(models, genId),
    checkOneriFinanziari(bilancio, genId),
    checkLiquidita(bilancio, genId),
    checkLeverage(bilancio, genId),
    checkCashFlowRatio(bilancio, genId),
    checkGoingConcern(models, genId),
  ];

  const alertCount = indicators.filter(i => i.status === 'ALERT').length;
  const warningCount = indicators.filter(i => i.status === 'WARNING').length;
  const passCount = indicators.filter(i => i.status === 'PASS').length;
  const hasSegnaliPrecrisi = alertCount > 0 || warningCount >= 3;

  let overallStatus: CCIIResult['overallStatus'];
  if (alertCount >= 2) overallStatus = 'CRISI PROBABILE';
  else if (alertCount >= 1 || warningCount >= 3) overallStatus = 'ATTENZIONE';
  else overallStatus = 'REGOLARE';

  const note = overallStatus === 'CRISI PROBABILE'
    ? `Rilevati ${alertCount} indicatori di allerta e ${warningCount} avvisi. Si raccomanda l'adozione immediata di misure di risanamento ai sensi Art. 14 D.Lgs. 14/2019 e notifica agli organi di controllo.`
    : overallStatus === 'ATTENZIONE'
    ? `Rilevati ${alertCount} indicatori di allerta e ${warningCount} avvisi. Monitoraggio rafforzato richiesto ai sensi Art. 3 CCII — adeguare gli assetti organizzativi.`
    : 'Nessun indicatore di crisi critico. L\'impresa rispetta i presupposti di adeguati assetti ai sensi D.Lgs. 14/2019.';

  return { indicators, alertCount, warningCount, passCount, overallStatus, hasSegnaliPrecrisi, note };
}
