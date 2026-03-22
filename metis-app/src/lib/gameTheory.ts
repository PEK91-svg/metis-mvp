// ─── Metis MVP — Game Theory Framework ─────────────────────────────────────────
// Modello Stackelberg Banca-Debitore per ottimizzazione condizioni creditizie.
// Leader: Banca (sceglie tasso, garanzie, LTV max)
// Follower: Debitore (accetta/rifiuta, sceglie importo)

import type { ParsedBilancio, RiskModelResults } from './types';

// ── Strategie ────────────────────────────────────────────────────────────────

export type BankStrategy = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type DebtorStrategy = 'ACCEPT_ALL' | 'NEGOTIATE' | 'WALK_AWAY';

export interface BankStrategyParams {
  label: BankStrategy;
  spreadBp: number;       // basis points sopra Euribor
  garanzieRichieste: 'FORTI' | 'MODERATE' | 'LEGGERE';
  ltvMax: number;         // percentuale 0-1
  description: string;
}

export interface DebtorStrategyParams {
  label: DebtorStrategy;
  acceptsStrategies: BankStrategy[]; // quali strategie banca accetta
  description: string;
}

export const BANK_STRATEGIES: Record<BankStrategy, BankStrategyParams> = {
  CONSERVATIVE: {
    label: 'CONSERVATIVE',
    spreadBp: 200,
    garanzieRichieste: 'FORTI',
    ltvMax: 0.50,
    description: 'Tasso alto (+200bp), garanzie reali forti, LTV max 50%',
  },
  BALANCED: {
    label: 'BALANCED',
    spreadBp: 120,
    garanzieRichieste: 'MODERATE',
    ltvMax: 0.70,
    description: 'Tasso medio (+120bp), garanzie moderate, LTV max 70%',
  },
  AGGRESSIVE: {
    label: 'AGGRESSIVE',
    spreadBp: 60,
    garanzieRichieste: 'LEGGERE',
    ltvMax: 0.85,
    description: 'Tasso basso (+60bp), garanzie leggere, LTV max 85%',
  },
};

export const DEBTOR_STRATEGIES: Record<DebtorStrategy, DebtorStrategyParams> = {
  ACCEPT_ALL: {
    label: 'ACCEPT_ALL',
    acceptsStrategies: ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'],
    description: 'Accetta qualsiasi condizione proposta dalla banca',
  },
  NEGOTIATE: {
    label: 'NEGOTIATE',
    acceptsStrategies: ['BALANCED', 'AGGRESSIVE'],
    description: 'Accetta solo condizioni bilanciate o aggressive',
  },
  WALK_AWAY: {
    label: 'WALK_AWAY',
    acceptsStrategies: ['AGGRESSIVE'],
    description: 'Accetta solo condizioni aggressive (basso tasso, garanzie leggere)',
  },
};

// ── Payoff & Matrix Types ────────────────────────────────────────────────────

export interface CellPayoff {
  bankStrategy: BankStrategy;
  debtorStrategy: DebtorStrategy;
  bankPayoff: number;
  debtorPayoff: number;
  dealHappens: boolean;
}

export interface PayoffMatrix {
  cells: CellPayoff[][];          // [bankIdx][debtorIdx] — 3x3
  bankStrategies: BankStrategy[];
  debtorStrategies: DebtorStrategy[];
  pdBase: number;                  // PD usata per il calcolo
  lgd: number;                     // LGD usata
  importo: number;
}

export interface NashEquilibrium {
  bankStrategy: BankStrategy;
  debtorStrategy: DebtorStrategy;
  bankPayoff: number;
  debtorPayoff: number;
  isStrict: boolean;
}

export interface SensitivityPoint {
  pdDelta: number;          // es. -0.01, 0, +0.01
  pdEffective: number;
  equilibrium: NashEquilibrium;
}

export interface OptimalStrategyResult {
  matrix: PayoffMatrix;
  nashEquilibrium: NashEquilibrium;
  recommendation: string;
  sensitivity: SensitivityPoint[];
  riskAssessment: 'BASSO' | 'MEDIO' | 'ALTO';
}

// ── Parametri di calcolo ─────────────────────────────────────────────────────

const EURIBOR_RATE = 0.035;        // Euribor 6M di riferimento
const BASE_LGD = 0.45;            // LGD standard Basilea
const COSTO_GARANZIE_FORTI = 0.025;   // costo annuo garanzie forti (% importo)
const COSTO_GARANZIE_MODERATE = 0.012; // costo annuo garanzie moderate
const COSTO_GARANZIE_LEGGERE = 0.004; // costo annuo garanzie leggere

function costoGaranzie(tipo: BankStrategyParams['garanzieRichieste']): number {
  switch (tipo) {
    case 'FORTI':    return COSTO_GARANZIE_FORTI;
    case 'MODERATE': return COSTO_GARANZIE_MODERATE;
    case 'LEGGERE':  return COSTO_GARANZIE_LEGGERE;
  }
}

// ── Stima PD dal modello ─────────────────────────────────────────────────────

function estimatePD(models: RiskModelResults): number {
  // Media ponderata delle probabilità dei modelli
  const ohlsonPD = models.ohlson.probability;
  const zmijewskiPD = models.zmijewski.probability;

  // Altman: conversione approssimativa score → PD
  let altmanPD: number;
  if (models.altman.score > 2.99) altmanPD = 0.005;
  else if (models.altman.score > 1.81) altmanPD = 0.05;
  else altmanPD = 0.15;

  // Ponderazione: Ohlson 40%, Zmijewski 30%, Altman 30%
  return ohlsonPD * 0.4 + zmijewskiPD * 0.3 + altmanPD * 0.3;
}

// ── LGD aggiustata per garanzie ──────────────────────────────────────────────

function adjustedLGD(bankParams: BankStrategyParams): number {
  switch (bankParams.garanzieRichieste) {
    case 'FORTI':    return BASE_LGD * 0.55; // ~24.75%
    case 'MODERATE': return BASE_LGD * 0.75; // ~33.75%
    case 'LEGGERE':  return BASE_LGD * 0.95; // ~42.75%
  }
}

// ── Calcolo Payoff Singola Cella ─────────────────────────────────────────────

function computeCellPayoff(
  bankParams: BankStrategyParams,
  debtorParams: DebtorStrategyParams,
  pd: number,
  importo: number,
): CellPayoff {
  const dealHappens = debtorParams.acceptsStrategies.includes(bankParams.label);

  if (!dealHappens) {
    // Nessun accordo: payoff zero per entrambi
    return {
      bankStrategy: bankParams.label,
      debtorStrategy: debtorParams.label,
      bankPayoff: 0,
      debtorPayoff: 0,
      dealHappens: false,
    };
  }

  const spread = bankParams.spreadBp / 10000;
  const tasso = EURIBOR_RATE + spread;
  const lgd = adjustedLGD(bankParams);

  // Payoff Banca: margine atteso * (1 - PD * LGD)
  // margine = spread * importo (ricavo annuo netto dal prestito)
  const margineAnnuo = spread * importo;
  const perditeAttese = pd * lgd * importo;
  const bankPayoff = margineAnnuo * (1 - pd * lgd) - perditeAttese * 0.08; // costo capitale regolamentare ~8% EL
  // Semplificazione: bankPayoff = spread * importo * (1 - pd * lgd)
  const bankPayoffFinal = spread * importo * (1 - pd * lgd);

  // Payoff Debitore: utilità = risparmio_interessi - costo_garanzie
  // risparmio_interessi = (tasso_max - tasso_effettivo) * importo
  // dove tasso_max = Euribor + 200bp (il peggio che potrebbe ricevere)
  const tassoMax = EURIBOR_RATE + 0.02; // max spread = 200bp
  const risparmioInteressi = (tassoMax - tasso) * importo;
  const costoGaranzieAnnuo = costoGaranzie(bankParams.garanzieRichieste) * importo;
  const debtorPayoff = risparmioInteressi - costoGaranzieAnnuo;

  return {
    bankStrategy: bankParams.label,
    debtorStrategy: debtorParams.label,
    bankPayoff: Math.round(bankPayoffFinal),
    debtorPayoff: Math.round(debtorPayoff),
    dealHappens,
  };
}

// ── Calcolo Matrice Payoff Completa ──────────────────────────────────────────

export function calculatePayoffMatrix(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  importo: number,
): PayoffMatrix {
  const pd = estimatePD(models);
  const bankKeys: BankStrategy[] = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'];
  const debtorKeys: DebtorStrategy[] = ['ACCEPT_ALL', 'NEGOTIATE', 'WALK_AWAY'];

  const cells: CellPayoff[][] = bankKeys.map(bk =>
    debtorKeys.map(dk =>
      computeCellPayoff(BANK_STRATEGIES[bk], DEBTOR_STRATEGIES[dk], pd, importo),
    ),
  );

  return {
    cells,
    bankStrategies: bankKeys,
    debtorStrategies: debtorKeys,
    pdBase: pd,
    lgd: BASE_LGD,
    importo,
  };
}

// ── Ricerca Nash Equilibrium ─────────────────────────────────────────────────
// Nash Equilibrium: la cella dove nessuno dei due giocatori ha incentivo
// a deviare unilateralmente dalla propria strategia.

export function findNashEquilibrium(matrix: PayoffMatrix): NashEquilibrium {
  const { cells, bankStrategies, debtorStrategies } = matrix;
  const numBank = bankStrategies.length;
  const numDebtor = debtorStrategies.length;

  // Per ogni cella, verificare se è un Nash Equilibrium
  const equilibria: NashEquilibrium[] = [];

  for (let b = 0; b < numBank; b++) {
    for (let d = 0; d < numDebtor; d++) {
      const current = cells[b][d];

      // Condizione 1: la banca non può migliorare cambiando strategia (colonna fissa)
      let bankBestResponse = true;
      for (let bAlt = 0; bAlt < numBank; bAlt++) {
        if (bAlt !== b && cells[bAlt][d].bankPayoff > current.bankPayoff) {
          bankBestResponse = false;
          break;
        }
      }

      // Condizione 2: il debitore non può migliorare cambiando strategia (riga fissa)
      let debtorBestResponse = true;
      for (let dAlt = 0; dAlt < numDebtor; dAlt++) {
        if (dAlt !== d && cells[b][dAlt].debtorPayoff > current.debtorPayoff) {
          debtorBestResponse = false;
          break;
        }
      }

      if (bankBestResponse && debtorBestResponse) {
        // Verifica se è stretto (strict Nash): nessuna alternativa ha payoff uguale
        let isStrict = true;
        for (let bAlt = 0; bAlt < numBank; bAlt++) {
          if (bAlt !== b && cells[bAlt][d].bankPayoff === current.bankPayoff) {
            isStrict = false;
            break;
          }
        }
        for (let dAlt = 0; dAlt < numDebtor; dAlt++) {
          if (dAlt !== d && cells[b][dAlt].debtorPayoff === current.debtorPayoff) {
            isStrict = false;
            break;
          }
        }

        equilibria.push({
          bankStrategy: bankStrategies[b],
          debtorStrategy: debtorStrategies[d],
          bankPayoff: current.bankPayoff,
          debtorPayoff: current.debtorPayoff,
          isStrict,
        });
      }
    }
  }

  // Se ci sono più equilibri, scegliere quello con payoff combinato maggiore
  if (equilibria.length > 0) {
    equilibria.sort((a, b) => (b.bankPayoff + b.debtorPayoff) - (a.bankPayoff + a.debtorPayoff));
    return equilibria[0];
  }

  // Fallback: se non c'è Nash puro, scegliere la cella con massimo payoff combinato
  let bestB = 0;
  let bestD = 0;
  let bestCombined = -Infinity;
  for (let b = 0; b < numBank; b++) {
    for (let d = 0; d < numDebtor; d++) {
      const combined = cells[b][d].bankPayoff + cells[b][d].debtorPayoff;
      if (combined > bestCombined) {
        bestCombined = combined;
        bestB = b;
        bestD = d;
      }
    }
  }

  return {
    bankStrategy: bankStrategies[bestB],
    debtorStrategy: debtorStrategies[bestD],
    bankPayoff: cells[bestB][bestD].bankPayoff,
    debtorPayoff: cells[bestB][bestD].debtorPayoff,
    isStrict: false,
  };
}

// ── Analisi di Sensitività ───────────────────────────────────────────────────

function calculateSensitivity(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  importo: number,
  basePD: number,
): SensitivityPoint[] {
  const deltas = [-0.02, -0.01, 0, 0.01, 0.02];
  return deltas.map(delta => {
    const pdEffective = Math.max(0.001, Math.min(0.50, basePD + delta));

    // Creare modelli "alterati" per ricalcolo
    const alteredModels: RiskModelResults = {
      ...models,
      ohlson: { ...models.ohlson, probability: pdEffective },
      zmijewski: { ...models.zmijewski, probability: pdEffective },
    };

    const matrix = calculatePayoffMatrix(bilancio, alteredModels, importo);
    const eq = findNashEquilibrium(matrix);

    return {
      pdDelta: delta,
      pdEffective: Math.round(pdEffective * 10000) / 10000,
      equilibrium: eq,
    };
  });
}

// ── Generazione Raccomandazione ──────────────────────────────────────────────

function generateRecommendation(
  nash: NashEquilibrium,
  pd: number,
  bilancio: ParsedBilancio,
): string {
  const company = bilancio.companyName || 'l\'azienda';
  const pdPct = (pd * 100).toFixed(2);

  const strategyDescriptions: Record<BankStrategy, string> = {
    CONSERVATIVE: `approccio conservativo (spread +200bp, LTV 50%, garanzie forti)`,
    BALANCED: `approccio bilanciato (spread +120bp, LTV 70%, garanzie moderate)`,
    AGGRESSIVE: `approccio aggressivo (spread +60bp, LTV 85%, garanzie leggere)`,
  };

  const debtorDescriptions: Record<DebtorStrategy, string> = {
    ACCEPT_ALL: 'il debitore accetterebbe qualsiasi condizione',
    NEGOTIATE: 'il debitore negozierà per condizioni migliori',
    WALK_AWAY: 'il debitore accetterà solo condizioni molto competitive',
  };

  let assessment: string;
  if (pd < 0.02) {
    assessment = `Con una PD stimata del ${pdPct}% (rischio basso), ${company} rappresenta un profilo creditizio solido.`;
  } else if (pd < 0.05) {
    assessment = `Con una PD stimata del ${pdPct}% (rischio medio), ${company} presenta un profilo creditizio nella media di mercato.`;
  } else {
    assessment = `Con una PD stimata del ${pdPct}% (rischio elevato), ${company} richiede cautela nell'erogazione.`;
  }

  return (
    `${assessment} ` +
    `L'equilibrio di Nash suggerisce un ${strategyDescriptions[nash.bankStrategy]}. ` +
    `In questo scenario, ${debtorDescriptions[nash.debtorStrategy]}. ` +
    `Il payoff atteso per la banca è €${nash.bankPayoff.toLocaleString('it-IT')} ` +
    `e per il debitore €${nash.debtorPayoff.toLocaleString('it-IT')}.` +
    (nash.isStrict
      ? ' Questo equilibrio è stretto: nessun giocatore ha alternative con payoff equivalente.'
      : ' Nota: l\'equilibrio non è stretto — esistono strategie alternative con payoff comparabile.')
  );
}

// ── Strategia Ottimale (entry point principale) ──────────────────────────────

export function getOptimalStrategy(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
  importo: number,
): OptimalStrategyResult {
  const matrix = calculatePayoffMatrix(bilancio, models, importo);
  const nash = findNashEquilibrium(matrix);
  const pd = matrix.pdBase;

  const sensitivity = calculateSensitivity(bilancio, models, importo, pd);
  const recommendation = generateRecommendation(nash, pd, bilancio);

  let riskAssessment: OptimalStrategyResult['riskAssessment'];
  if (pd < 0.02) riskAssessment = 'BASSO';
  else if (pd < 0.05) riskAssessment = 'MEDIO';
  else riskAssessment = 'ALTO';

  return {
    matrix,
    nashEquilibrium: nash,
    recommendation,
    sensitivity,
    riskAssessment,
  };
}
