// ─── Metis MVP — Product Simulator Engine ───────────────────────────────────
// Simula diversi prodotti creditizi e determina il più profittevole per la banca
// nel contesto del credit underwriting bancario italiano.

import type { ParsedBilancio } from './types';

// ── Tipi ─────────────────────────────────────────────────────────────────────

export type ProductType =
  | 'REVOLVING'
  | 'CHIROGRAFARIO'
  | 'IPOTECARIO'
  | 'SBF'
  | 'LEASING';

export interface ProductConfig {
  tipo: ProductType;
  label: string;
  descrizione: string;
  spreadBase: number;        // spread annuo base (%)
  commissioneAnnuale: number; // commissione fissa annua (%)
  lgdBase: number;           // LGD base stimata (%)
  ltvMax: number;            // LTV massimo (0 se non applicabile)
  durataMinMesi: number;
  durataMaxMesi: number;
  importoMin: number;
  importoMax: number;
}

export interface SimulationResult {
  tipo: ProductType;
  label: string;
  descrizione: string;
  importo: number;
  durataMesi: number;

  // Metriche calcolate
  dscrImpatto: number;           // DSCR post-prodotto
  dscrDelta: number;             // Variazione DSCR (negativa = peggioramento)
  margineBanca: number;          // Margine banca annuo (%)
  coperturaGaranzia: number;     // Copertura garanzia (%) — inversa LGD
  lgdStimata: number;            // LGD stimata (%)
  taegCliente: number;           // TAEG equivalente per il cliente (%)
  rischioResiduo: number;        // Rischio residuo banca (0-100)
  rischioLabel: 'BASSO' | 'MEDIO' | 'ALTO';

  // Score complessivo
  score: number;                 // Media ponderata (0-100)
  raccomandato: boolean;

  // Dettagli breakdown
  breakdown: {
    rataAnnuale: number;
    costoTotaleCliente: number;
    margineTotale: number;
    commissioniTotali: number;
  };
}

// ── Configurazione prodotti ──────────────────────────────────────────────────

const PRODUCT_CONFIGS: ProductConfig[] = [
  {
    tipo: 'REVOLVING',
    label: 'Linea Revolving',
    descrizione: 'Linea di credito revolving con utilizzo flessibile e commissione annuale su accordato',
    spreadBase: 3.5,
    commissioneAnnuale: 0.5,
    lgdBase: 55,
    ltvMax: 0,
    durataMinMesi: 12,
    durataMaxMesi: 60,
    importoMin: 50000,
    importoMax: 2000000,
  },
  {
    tipo: 'CHIROGRAFARIO',
    label: 'Prestito Chirografario',
    descrizione: 'Finanziamento a rate fisse senza garanzia reale, rimborso ammortamento costante',
    spreadBase: 2.8,
    commissioneAnnuale: 0.3,
    lgdBase: 60,
    ltvMax: 0,
    durataMinMesi: 12,
    durataMaxMesi: 84,
    importoMin: 50000,
    importoMax: 1500000,
  },
  {
    tipo: 'IPOTECARIO',
    label: 'Mutuo Ipotecario',
    descrizione: 'Mutuo con garanzia ipotecaria su immobile, tasso più basso e durata lunga',
    spreadBase: 1.4,
    commissioneAnnuale: 0.15,
    lgdBase: 25,
    ltvMax: 80,
    durataMinMesi: 60,
    durataMaxMesi: 240,
    importoMin: 100000,
    importoMax: 5000000,
  },
  {
    tipo: 'SBF',
    label: 'Sconto Bancario Fatture',
    descrizione: 'Anticipo fatture commerciali con margine su fido concesso e cessione pro-solvendo',
    spreadBase: 2.2,
    commissioneAnnuale: 0.8,
    lgdBase: 40,
    ltvMax: 0,
    durataMinMesi: 3,
    durataMaxMesi: 12,
    importoMin: 30000,
    importoMax: 2000000,
  },
  {
    tipo: 'LEASING',
    label: 'Leasing Finanziario',
    descrizione: 'Leasing con canone periodico e opzione di riscatto finale, bene a garanzia',
    spreadBase: 2.0,
    commissioneAnnuale: 0.4,
    lgdBase: 30,
    ltvMax: 100,
    durataMinMesi: 24,
    durataMaxMesi: 120,
    importoMin: 50000,
    importoMax: 3000000,
  },
];

// ── Costanti ─────────────────────────────────────────────────────────────────

const EURIBOR_6M = 3.2; // Tasso base di riferimento (%)

// Pesi per lo score complessivo
const WEIGHT_MARGINE = 0.30;
const WEIGHT_RISCHIO = 0.30;
const WEIGHT_DSCR = 0.25;
const WEIGHT_COPERTURA = 0.15;

// ── Funzioni di calcolo ──────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calcola il DSCR attuale dal bilancio.
 */
function calcolaDSCRBase(bilancio: ParsedBilancio): number {
  const debtService = bilancio.debtService || (bilancio.oneriFinanziari + bilancio.debitiBreveTermine * 0.15);
  if (debtService <= 0) return 5.0;
  return bilancio.ebitda / debtService;
}

/**
 * Calcola la rata annuale di un finanziamento ammortizzato (francese).
 */
function rataAnnualeAmmortamento(importo: number, tassoAnnuo: number, durataMesi: number): number {
  const r = tassoAnnuo / 100 / 12;
  const n = durataMesi;
  if (r === 0) return (importo / n) * 12;
  const rataMensile = importo * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return rataMensile * 12;
}

/**
 * Calcola il costo annuale per prodotto revolving (interessi su utilizzo medio + commissione su accordato).
 */
function costoAnnualeRevolving(importo: number, tasso: number, commissione: number): number {
  const utilizzoMedio = importo * 0.70; // media 60-80%
  const interessiAnnui = utilizzoMedio * (tasso / 100);
  const commissioneAnnua = importo * (commissione / 100);
  return interessiAnnui + commissioneAnnua;
}

/**
 * Calcola il costo annuale per SBF (margine sull'anticipo + commissione).
 */
function costoAnnualeSBF(importo: number, tasso: number, commissione: number): number {
  const anticipoMedio = importo * 0.80; // anticipo 80% del plafond
  const rotazioneAnnua = 4; // ~4 rotazioni anno (fatture a 90gg)
  const interessiPerRotazione = anticipoMedio * (tasso / 100) * (90 / 365);
  const interessiAnnui = interessiPerRotazione * rotazioneAnnua;
  const commissioneAnnua = importo * (commissione / 100);
  return interessiAnnui + commissioneAnnua;
}

/**
 * Calcola il costo annuale per leasing (canone + commissione).
 */
function costoAnnualeLeasing(importo: number, tasso: number, commissione: number, durataMesi: number): number {
  const valoreRiscatto = importo * 0.01; // riscatto 1%
  const importoFinanziato = importo - valoreRiscatto;
  const rata = rataAnnualeAmmortamento(importoFinanziato, tasso, durataMesi);
  const commissioneAnnua = importo * (commissione / 100);
  return rata + commissioneAnnua;
}

/**
 * Stima la LGD in base al tipo di prodotto, leverage e copertura garanzia.
 */
function stimaLGD(config: ProductConfig, bilancio: ParsedBilancio, importo: number): number {
  let lgd = config.lgdBase;

  // Aggiustamento per leverage
  const leverage = bilancio.totaleDebiti / Math.max(bilancio.patrimonioNetto, 1);
  if (leverage > 4) lgd += 10;
  else if (leverage > 2.5) lgd += 5;
  else if (leverage < 1.5) lgd -= 5;

  // Aggiustamento per dimensione relativa (importo / attivo)
  const rapportoAttivo = importo / Math.max(bilancio.totaleAttivo, 1);
  if (rapportoAttivo > 0.3) lgd += 8;
  else if (rapportoAttivo > 0.15) lgd += 3;

  // Ipotecario ha garanzia reale forte
  if (config.tipo === 'IPOTECARIO') {
    lgd -= 15;
  }

  // Leasing ha bene sottostante
  if (config.tipo === 'LEASING') {
    lgd -= 10;
  }

  // SBF ha crediti commerciali a garanzia
  if (config.tipo === 'SBF') {
    const rapportoCrediti = bilancio.crediti / Math.max(importo, 1);
    if (rapportoCrediti > 2) lgd -= 10;
    else if (rapportoCrediti > 1.2) lgd -= 5;
  }

  return clamp(lgd, 5, 90);
}

/**
 * Calcola lo spread effettivo in base al profilo di rischio dell'azienda.
 */
function spreadEffettivo(config: ProductConfig, bilancio: ParsedBilancio): number {
  let spread = config.spreadBase;

  // Aggiustamento per EBITDA margin
  if (bilancio.ebitdaMargin > 20) spread -= 0.3;
  else if (bilancio.ebitdaMargin < 8) spread += 0.5;

  // Aggiustamento per leverage
  const leverage = bilancio.totaleDebiti / Math.max(bilancio.patrimonioNetto, 1);
  if (leverage > 4) spread += 0.8;
  else if (leverage > 3) spread += 0.4;
  else if (leverage < 1.5) spread -= 0.2;

  // Aggiustamento per dimensione (ricavi come proxy)
  if (bilancio.ricavi > 10000000) spread -= 0.2;
  else if (bilancio.ricavi < 2000000) spread += 0.3;

  return clamp(spread, 0.5, 8.0);
}

/**
 * Simula un singolo prodotto creditizio.
 */
function simulaProdotto(
  config: ProductConfig,
  bilancio: ParsedBilancio,
  importo: number,
  durataMesi: number,
): SimulationResult {
  const importoEffettivo = clamp(importo, config.importoMin, config.importoMax);
  const durataEffettiva = clamp(durataMesi, config.durataMinMesi, config.durataMaxMesi);

  const spread = spreadEffettivo(config, bilancio);
  const tassoCliente = EURIBOR_6M + spread;
  const lgd = stimaLGD(config, bilancio, importoEffettivo);

  // Calcolo costo annuale per il cliente
  let costoAnnualeCliente: number;
  switch (config.tipo) {
    case 'REVOLVING':
      costoAnnualeCliente = costoAnnualeRevolving(importoEffettivo, tassoCliente, config.commissioneAnnuale);
      break;
    case 'SBF':
      costoAnnualeCliente = costoAnnualeSBF(importoEffettivo, tassoCliente, config.commissioneAnnuale);
      break;
    case 'LEASING':
      costoAnnualeCliente = costoAnnualeLeasing(importoEffettivo, tassoCliente, config.commissioneAnnuale, durataEffettiva);
      break;
    case 'CHIROGRAFARIO':
    case 'IPOTECARIO':
    default:
      costoAnnualeCliente = rataAnnualeAmmortamento(importoEffettivo, tassoCliente, durataEffettiva)
        + importoEffettivo * (config.commissioneAnnuale / 100);
      break;
  }

  // TAEG equivalente
  const taeg = (costoAnnualeCliente / importoEffettivo) * 100;

  // Margine banca = spread + commissione - costo del rischio stimato
  const costoRischio = (lgd / 100) * 0.02 * 100; // PD stimata ~2% * LGD
  const margineBanca = spread + config.commissioneAnnuale - costoRischio;

  // Impatto DSCR
  const dscrBase = calcolaDSCRBase(bilancio);
  const nuovoDebtService = (bilancio.debtService || (bilancio.oneriFinanziari + bilancio.debitiBreveTermine * 0.15))
    + costoAnnualeCliente;
  const dscrPost = bilancio.ebitda / Math.max(nuovoDebtService, 1);
  const dscrDelta = dscrPost - dscrBase;

  // Copertura garanzia (inversa LGD)
  const copertura = 100 - lgd;

  // Rischio residuo (0-100): combinazione di LGD, DSCR post e leverage
  const leverage = bilancio.totaleDebiti / Math.max(bilancio.patrimonioNetto, 1);
  let rischioResiduo = lgd * 0.4 + (1 / Math.max(dscrPost, 0.3)) * 25 + Math.min(leverage / 5, 1) * 20;
  rischioResiduo = clamp(rischioResiduo, 5, 95);

  const rischioLabel: SimulationResult['rischioLabel'] =
    rischioResiduo < 35 ? 'BASSO' : rischioResiduo < 65 ? 'MEDIO' : 'ALTO';

  // Score complessivo (0-100)
  const scoreMargin = clamp((margineBanca / 5) * 100, 0, 100);
  const scoreRischio = 100 - rischioResiduo;
  const scoreDSCR = clamp((dscrPost / 2) * 100, 0, 100);
  const scoreCopertura = copertura;

  const score = clamp(
    scoreMargin * WEIGHT_MARGINE +
    scoreRischio * WEIGHT_RISCHIO +
    scoreDSCR * WEIGHT_DSCR +
    scoreCopertura * WEIGHT_COPERTURA,
    0,
    100,
  );

  // Breakdown
  const durataAnni = durataEffettiva / 12;
  const costoTotaleCliente = costoAnnualeCliente * durataAnni;
  const commissioniTotali = importoEffettivo * (config.commissioneAnnuale / 100) * durataAnni;
  const margineTotale = importoEffettivo * (margineBanca / 100) * durataAnni;

  return {
    tipo: config.tipo,
    label: config.label,
    descrizione: config.descrizione,
    importo: importoEffettivo,
    durataMesi: durataEffettiva,
    dscrImpatto: Math.round(dscrPost * 100) / 100,
    dscrDelta: Math.round(dscrDelta * 100) / 100,
    margineBanca: Math.round(margineBanca * 100) / 100,
    coperturaGaranzia: Math.round(copertura * 10) / 10,
    lgdStimata: Math.round(lgd * 10) / 10,
    taegCliente: Math.round(taeg * 100) / 100,
    rischioResiduo: Math.round(rischioResiduo * 10) / 10,
    rischioLabel,
    score: Math.round(score * 10) / 10,
    raccomandato: false, // verrà impostato dopo l'ordinamento
    breakdown: {
      rataAnnuale: Math.round(costoAnnualeCliente),
      costoTotaleCliente: Math.round(costoTotaleCliente),
      margineTotale: Math.round(margineTotale),
      commissioniTotali: Math.round(commissioniTotali),
    },
  };
}

// ── Entry Point ──────────────────────────────────────────────────────────────

/**
 * Simula tutti i prodotti creditizi e restituisce i risultati ordinati per score.
 *
 * @param bilancio - Dati del bilancio dell'azienda (ParsedBilancio)
 * @param importo  - Importo richiesto (EUR)
 * @param durataMesi - Durata richiesta in mesi
 * @returns Array di SimulationResult ordinato per score decrescente
 */
export function simulaProdotti(
  bilancio: ParsedBilancio,
  importo: number,
  durataMesi: number,
): SimulationResult[] {
  const results = PRODUCT_CONFIGS.map((config) =>
    simulaProdotto(config, bilancio, importo, durataMesi),
  );

  // Ordina per score decrescente
  results.sort((a, b) => b.score - a.score);

  // Marca il migliore come raccomandato
  if (results.length > 0) {
    results[0].raccomandato = true;
  }

  return results;
}

/**
 * Restituisce le configurazioni disponibili (utile per UI).
 */
export function getProductConfigs(): ProductConfig[] {
  return [...PRODUCT_CONFIGS];
}

/**
 * Restituisce il tasso base corrente (EURIBOR 6M).
 */
export function getTassoBase(): number {
  return EURIBOR_6M;
}
