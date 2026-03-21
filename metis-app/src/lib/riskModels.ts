// ─── Deterministic Risk Model Calculations ────────────────────────────────────
// All formulas are transparent, auditable, and EU AI Act compliant (Glass-Box).

import {
  ParsedBilancio,
  AltmanResult,
  OhlsonResult,
  ZmijewskiResult,
  DSCRResult,
  RiskModelResults,
} from './types';

// ── Altman Z'-Score (1983, private firms) ─────────────────────────────────────
// Revised model for non-listed companies — X4 uses book value of equity, not market.
// Z' = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5
// Thresholds: >2.9 Safe · 1.23–2.9 Grey · <1.23 Distress
export function calculateAltman(b: ParsedBilancio): AltmanResult {
  const ta = b.totaleAttivo || 1;
  const tl = b.totaleDebiti || 1;

  const x1 = b.capitaleDiLavoro / ta;         // Working Capital / Total Assets
  const x2 = b.utiliNonDistribuiti / ta;       // Retained Earnings / Total Assets
  const x3 = b.ebit / ta;                      // EBIT / Total Assets
  const x4 = b.patrimonioNetto / tl;           // Book Value of Equity / Total Liabilities (private firm)
  const x5 = b.fatturato / ta;                 // Sales / Total Assets

  const score = 0.717 * x1 + 0.847 * x2 + 3.107 * x3 + 0.420 * x4 + 0.998 * x5;
  const rounded = Math.round(score * 100) / 100;

  let status: AltmanResult['status'];
  let description: string;

  if (rounded > 2.9) {
    status = 'SAFE ZONE';
    description = `Lo Z'-Score di ${rounded} posiziona l'azienda nella zona di sicurezza (>2.9). La struttura finanziaria è solida con bassa probabilità di insolvenza nei prossimi 24 mesi.`;
  } else if (rounded >= 1.23) {
    status = 'GREY ZONE';
    description = `Lo Z'-Score di ${rounded} colloca l'azienda nella zona grigia (1.23–2.9). È necessario un monitoraggio attento: il profilo di rischio non è ancora critico ma presenta segnali di attenzione.`;
  } else {
    status = 'DISTRESS ZONE';
    description = `Lo Z'-Score di ${rounded} indica zona di distress (<1.23). Rischio elevato di default: la combinazione di leverage, redditività e liquidità richiede intervento immediato.`;
  }

  return {
    score: rounded,
    status,
    components: {
      x1: Math.round(x1 * 10000) / 10000,
      x2: Math.round(x2 * 10000) / 10000,
      x3: Math.round(x3 * 10000) / 10000,
      x4: Math.round(x4 * 10000) / 10000,
      x5: Math.round(x5 * 10000) / 10000,
    },
    description,
  };
}

// ── Ohlson O-Score (1980) ─────────────────────────────────────────────────────
// O = -1.32 - 0.407*log(TA/GNP) + 6.03*(TL/TA) - 1.43*(WC/TA) + 0.0757*(CL/CA)
//     - 1.72*(OENEG) - 2.37*(NI/TA) - 1.83*(FFO/TL) + 0.285*(INTWO) - 0.521*(CHIN)
// Probability = 1 / (1 + e^(-O))
export function calculateOhlson(b: ParsedBilancio): OhlsonResult {
  const ta = b.totaleAttivo || 1;
  const tl = b.totaleDebiti || 1;
  const ca = b.attivoCorrenti || 1;
  const cl = b.passivoCorrenti || 1;

  // SIZE: log(Total Assets / GNP deflator) — use log(TA) as approximation
  const size = Math.log(ta);
  // TL/TA
  const tlta = tl / ta;
  // WC/TA
  const wcta = b.capitaleDiLavoro / ta;
  // CL/CA
  const clca = cl / Math.max(ca, 1);
  // OENEG: 1 if TL > TA, 0 otherwise
  const oeneg = tl > ta ? 1 : 0;
  // NI/TA
  const nita = b.utileNetto / ta;
  // FFO/TL: Funds from Operations / Total Liabilities
  const ffo = b.utileNetto + b.ammortamenti;
  const ffotl = ffo / Math.max(tl, 1);
  // INTWO: 1 if net income was negative for last 2 years (approximate: check current)
  const intwo = b.utileNetto < 0 ? 1 : 0;
  // CHIN: Change in Net Income (use 0 if only 1 year)
  const chin = 0; // Would need multi-year data

  const oScore = -1.32 - 0.407 * size + 6.03 * tlta - 1.43 * wcta + 0.0757 * clca
    - 1.72 * oeneg - 2.37 * nita - 1.83 * ffotl + 0.285 * intwo - 0.521 * chin;

  const probability = 1 / (1 + Math.exp(-oScore));
  const rounded = Math.round(oScore * 100) / 100;
  const probPct = Math.round(probability * 10000) / 100;

  let status: OhlsonResult['status'];
  let description: string;

  if (probability < 0.3) {
    status = 'BASSO RISCHIO';
    description = `L'O-Score di ${rounded} (PD: ${probPct}%) indica un profilo a basso rischio. I fondamentali finanziari sono coerenti con un'operatività sostenibile.`;
  } else if (probability < 0.6) {
    status = 'RISCHIO MODERATO';
    description = `L'O-Score di ${rounded} (PD: ${probPct}%) segnala rischio moderato. Alcuni indicatori di leverage o liquidità richiedono monitoraggio.`;
  } else {
    status = 'ALTO RISCHIO';
    description = `L'O-Score di ${rounded} (PD: ${probPct}%) evidenzia alto rischio di insolvenza. La combinazione di leverage elevato e marginalità ridotta è critica.`;
  }

  return {
    score: rounded,
    probability: probPct,
    status,
    components: {
      size: Math.round(size * 100) / 100,
      tlta: Math.round(tlta * 10000) / 10000,
      wcta: Math.round(wcta * 10000) / 10000,
      clca: Math.round(clca * 10000) / 10000,
      oeneg,
      nita: Math.round(nita * 10000) / 10000,
      ffotl: Math.round(ffotl * 10000) / 10000,
      intwo,
      chin,
    },
    description,
  };
}

// ── Zmijewski X-Score (1984) ──────────────────────────────────────────────────
// X = -4.336 - 4.513*(NI/TA) + 5.679*(TL/TA) + 0.004*(CA/CL)
// Probability = 1 / (1 + e^(-X))
export function calculateZmijewski(b: ParsedBilancio): ZmijewskiResult {
  const ta = b.totaleAttivo || 1;
  const tl = b.totaleDebiti || 1;
  const ca = b.attivoCorrenti || 1;
  const cl = b.passivoCorrenti || 1;

  const roe = b.utileNetto / ta;    // NI/TA (actually ROA here, matching Zmijewski original)
  const leverage = tl / ta;          // TL/TA
  const liquidity = ca / Math.max(cl, 1); // CA/CL

  const xScore = -4.336 - 4.513 * roe + 5.679 * leverage + 0.004 * liquidity;
  const probability = 1 / (1 + Math.exp(-xScore));
  const rounded = Math.round(xScore * 100) / 100;
  const probPct = Math.round(probability * 10000) / 100;

  let status: ZmijewskiResult['status'];
  let description: string;

  if (probability < 0.25) {
    status = 'BASSO RISCHIO';
    description = `Lo X-Score di ${rounded} (PD: ${probPct}%) conferma stabilità finanziaria. Il rapporto leverage/profittabilità è equilibrato.`;
  } else if (probability < 0.55) {
    status = 'RISCHIO MODERATO';
    description = `Lo X-Score di ${rounded} (PD: ${probPct}%) indica rischio moderato. Il leverage è nella fascia di attenzione.`;
  } else {
    status = 'ALTO RISCHIO';
    description = `Lo X-Score di ${rounded} (PD: ${probPct}%) segnala alto rischio. La struttura debitoria è sproporzionata rispetto alla capacità di generare utile.`;
  }

  return {
    score: rounded,
    probability: probPct,
    status,
    components: {
      roe: Math.round(roe * 10000) / 10000,
      leverage: Math.round(leverage * 10000) / 10000,
      liquidity: Math.round(liquidity * 10000) / 10000,
    },
    description,
  };
}

// ── DSCR — Debt Service Coverage Ratio ────────────────────────────────────────
// DSCR = EBITDA / Debt Service (annual principal + interest payments)
export function calculateDSCR(b: ParsedBilancio): DSCRResult {
  const ds = b.debtService || 1;
  const base = b.ebitda / ds;

  // Optimistic: +15% EBITDA, same debt service
  const ottimistico = (b.ebitda * 1.15) / ds;
  // Stress: -20% EBITDA, +10% debt service
  const stress = (b.ebitda * 0.80) / (ds * 1.10);

  const baseRounded = Math.round(base * 100) / 100;
  const ottRounded = Math.round(ottimistico * 100) / 100;
  const stressRounded = Math.round(stress * 100) / 100;

  let status: DSCRResult['status'];
  let scenarioSelezionato: DSCRResult['scenarioSelezionato'] = 'BASE';
  let description: string;

  if (baseRounded >= 1.25) {
    status = 'ADEGUATO';
    description = `DSCR base di ${baseRounded}x indica capacità adeguata di servizio del debito. Anche nello scenario stress (${stressRounded}x) la copertura resta ${stressRounded >= 1 ? 'sufficiente' : 'a rischio'}.`;
  } else if (baseRounded >= 1.0) {
    status = 'MARGINALE';
    description = `DSCR base di ${baseRounded}x è marginale. La capacità di servizio del debito è sufficiente solo in condizioni normali. Lo scenario stress (${stressRounded}x) evidenzia fragilità.`;
    if (stressRounded < 1.0) scenarioSelezionato = 'STRESS';
  } else {
    status = 'INSUFFICIENTE';
    scenarioSelezionato = 'STRESS';
    description = `DSCR base di ${baseRounded}x è insufficiente (<1.0). L'azienda non genera flussi di cassa sufficienti a coprire il servizio del debito. Rischio concreto di default.`;
  }

  return {
    base: baseRounded,
    ottimistico: ottRounded,
    stress: stressRounded,
    status,
    scenarioSelezionato,
    description,
  };
}

// ── Aggregate All Models ──────────────────────────────────────────────────────
export function calculateAllModels(bilancio: ParsedBilancio): RiskModelResults {
  return {
    altman: calculateAltman(bilancio),
    ohlson: calculateOhlson(bilancio),
    zmijewski: calculateZmijewski(bilancio),
    dscr: calculateDSCR(bilancio),
  };
}

// ── Estimate PD from model consensus ──────────────────────────────────────────
export function estimatePD(models: RiskModelResults): number {
  // Weighted average of model-implied PDs
  // Altman Z' thresholds: >2.9 Safe, 1.23–2.9 Grey, <1.23 Distress (Altman 1983, private firms)
  let altmanPD: number;
  if (models.altman.score > 2.9) altmanPD = 0.5;
  else if (models.altman.score >= 1.23) altmanPD = 3.0 + (2.9 - models.altman.score) * 5;
  else altmanPD = 15.0 + (1.23 - models.altman.score) * 10;

  const ohlsonPD = models.ohlson.probability;
  const zmijewskiPD = models.zmijewski.probability;

  // Weighted consensus: Altman 30%, Ohlson 40%, Zmijewski 30%
  const pd = altmanPD * 0.3 + ohlsonPD * 0.4 + zmijewskiPD * 0.3;
  return Math.round(Math.min(Math.max(pd, 0.1), 99.9) * 100) / 100;
}
