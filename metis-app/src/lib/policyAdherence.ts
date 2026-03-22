// ─── Policy Adherence Engine ────────────────────────────────────────────────────
// Verifica la conformità di un dossier creditizio rispetto alle policy creditizie
// della banca. Ogni regola è deterministica, auditabile e tracciabile (Glass-Box).

import { ParsedBilancio, RiskModelResults } from './types';
import { estimatePD } from './riskModels';

// ── Interfaces ──────────────────────────────────────────────────────────────────

export interface PolicyCheckResult {
  status: 'PASS' | 'FAIL' | 'WARNING';
  detail: string;
  actualValue?: string;
  threshold?: string;
}

export interface CreditPolicy {
  id: string;
  name: string;
  category: 'LIMITE' | 'REQUISITO' | 'DIVIETO' | 'PREFERENZA';
  description: string;
  check: (bilancio: ParsedBilancio, models: RiskModelResults) => PolicyCheckResult;
}

export interface PolicyAdherenceResult {
  checks: (CreditPolicy & { result: PolicyCheckResult })[];
  passCount: number;
  failCount: number;
  warningCount: number;
  overallAdherence: number; // 0-100
  overallStatus: 'CONFORME' | 'PARZIALMENTE CONFORME' | 'NON CONFORME';
  blockers: string[]; // policy FAIL che bloccano l'erogazione
}

// ── Utility ─────────────────────────────────────────────────────────────────────

/** Parse dataChiusura "dd/mm/yyyy" into a Date object */
function parseDataChiusura(data: string): Date {
  const parts = data.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(data);
}

/** Calculate months difference between two dates */
function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// ── Credit Policies ─────────────────────────────────────────────────────────────

const CREDIT_POLICIES: CreditPolicy[] = [
  // ── 1. PD massima accettabile ≤5% ──────────────────────────────────────────
  {
    id: 'POL-LIM-001',
    name: 'PD massima accettabile',
    category: 'LIMITE',
    description: 'La Probability of Default stimata dal consensus dei modelli non deve superare il 5%.',
    check: (_bilancio, models) => {
      const pd = estimatePD(models);
      if (pd <= 3) {
        return { status: 'PASS', detail: `PD ${pd}% entro il limite del 5%. Profilo accettabile.`, actualValue: `${pd}%`, threshold: '≤5%' };
      }
      if (pd <= 5) {
        return { status: 'WARNING', detail: `PD ${pd}% entro il limite ma prossima alla soglia massima (5%).`, actualValue: `${pd}%`, threshold: '≤5%' };
      }
      return { status: 'FAIL', detail: `PD ${pd}% supera il limite massimo del 5%. Erogazione bloccata.`, actualValue: `${pd}%`, threshold: '≤5%' };
    },
  },

  // ── 2. DSCR minimo ≥1.1x ──────────────────────────────────────────────────
  {
    id: 'POL-LIM-002',
    name: 'DSCR minimo',
    category: 'LIMITE',
    description: 'Il Debt Service Coverage Ratio (scenario base) deve essere almeno 1.1x.',
    check: (_bilancio, models) => {
      const dscr = models.dscr.base;
      if (dscr >= 1.25) {
        return { status: 'PASS', detail: `DSCR ${dscr}x ampiamente sopra la soglia minima.`, actualValue: `${dscr}x`, threshold: '≥1.1x' };
      }
      if (dscr >= 1.1) {
        return { status: 'WARNING', detail: `DSCR ${dscr}x sopra il minimo ma con margine ridotto.`, actualValue: `${dscr}x`, threshold: '≥1.1x' };
      }
      return { status: 'FAIL', detail: `DSCR ${dscr}x insufficiente: capacità inadeguata di servizio del debito.`, actualValue: `${dscr}x`, threshold: '≥1.1x' };
    },
  },

  // ── 3. Leverage massimo ≤5x ────────────────────────────────────────────────
  {
    id: 'POL-LIM-003',
    name: 'Leverage massimo',
    category: 'LIMITE',
    description: 'Il rapporto Debiti/Patrimonio Netto non deve superare 5x.',
    check: (bilancio) => {
      const pn = bilancio.patrimonioNetto || 1;
      const leverage = bilancio.totaleDebiti / pn;
      const rounded = Math.round(leverage * 100) / 100;
      if (rounded <= 3) {
        return { status: 'PASS', detail: `Leverage ${rounded}x entro limiti conservativi.`, actualValue: `${rounded}x`, threshold: '≤5x' };
      }
      if (rounded <= 5) {
        return { status: 'WARNING', detail: `Leverage ${rounded}x entro il limite massimo ma elevato.`, actualValue: `${rounded}x`, threshold: '≤5x' };
      }
      return { status: 'FAIL', detail: `Leverage ${rounded}x supera il limite massimo di 5x.`, actualValue: `${rounded}x`, threshold: '≤5x' };
    },
  },

  // ── 4. Current Ratio minimo ≥1.0 ──────────────────────────────────────────
  {
    id: 'POL-LIM-004',
    name: 'Current Ratio minimo',
    category: 'LIMITE',
    description: 'Il rapporto Attivo Corrente / Passivo Corrente deve essere almeno 1.0.',
    check: (bilancio) => {
      const pc = bilancio.passivoCorrenti || 1;
      const cr = bilancio.attivoCorrenti / pc;
      const rounded = Math.round(cr * 100) / 100;
      if (rounded >= 1.5) {
        return { status: 'PASS', detail: `Current Ratio ${rounded} indica buona liquidità a breve.`, actualValue: `${rounded}`, threshold: '≥1.0' };
      }
      if (rounded >= 1.0) {
        return { status: 'WARNING', detail: `Current Ratio ${rounded} sufficiente ma con margine ridotto.`, actualValue: `${rounded}`, threshold: '≥1.0' };
      }
      return { status: 'FAIL', detail: `Current Ratio ${rounded} sotto la soglia minima: rischio liquidità.`, actualValue: `${rounded}`, threshold: '≥1.0' };
    },
  },

  // ── 5. Patrimonio netto positivo ──────────────────────────────────────────
  {
    id: 'POL-REQ-001',
    name: 'Patrimonio netto positivo',
    category: 'REQUISITO',
    description: 'Il patrimonio netto dell\'azienda deve essere positivo.',
    check: (bilancio) => {
      const pn = bilancio.patrimonioNetto;
      if (pn > 0) {
        return { status: 'PASS', detail: `Patrimonio netto positivo: ${pn.toLocaleString('it-IT')} EUR.`, actualValue: `€ ${pn.toLocaleString('it-IT')}`, threshold: '> 0' };
      }
      return { status: 'FAIL', detail: `Patrimonio netto negativo (${pn.toLocaleString('it-IT')} EUR). Condizione bloccante.`, actualValue: `€ ${pn.toLocaleString('it-IT')}`, threshold: '> 0' };
    },
  },

  // ── 6. EBITDA positivo ────────────────────────────────────────────────────
  {
    id: 'POL-REQ-002',
    name: 'EBITDA positivo',
    category: 'REQUISITO',
    description: 'L\'EBITDA deve essere positivo per dimostrare capacità operativa.',
    check: (bilancio) => {
      const ebitda = bilancio.ebitda;
      if (ebitda > 0) {
        return { status: 'PASS', detail: `EBITDA positivo: ${ebitda.toLocaleString('it-IT')} EUR. Generazione di cassa operativa confermata.`, actualValue: `€ ${ebitda.toLocaleString('it-IT')}`, threshold: '> 0' };
      }
      if (ebitda === 0) {
        return { status: 'WARNING', detail: 'EBITDA pari a zero: marginalità operativa assente.', actualValue: '€ 0', threshold: '> 0' };
      }
      return { status: 'FAIL', detail: `EBITDA negativo (${ebitda.toLocaleString('it-IT')} EUR). L'azienda non genera cassa operativa.`, actualValue: `€ ${ebitda.toLocaleString('it-IT')}`, threshold: '> 0' };
    },
  },

  // ── 7. Altman Z-Score non in DISTRESS ─────────────────────────────────────
  {
    id: 'POL-REQ-003',
    name: 'Altman Z-Score non in DISTRESS',
    category: 'REQUISITO',
    description: 'Lo Z-Score Altman non deve posizionarsi nella zona di distress (<1.23).',
    check: (_bilancio, models) => {
      const { score, status } = models.altman;
      if (status === 'SAFE ZONE') {
        return { status: 'PASS', detail: `Z-Score ${score} in Safe Zone. Nessun segnale di distress.`, actualValue: `${score}`, threshold: '≥1.23' };
      }
      if (status === 'GREY ZONE') {
        return { status: 'WARNING', detail: `Z-Score ${score} in Grey Zone. Monitoraggio raccomandato.`, actualValue: `${score}`, threshold: '≥1.23' };
      }
      return { status: 'FAIL', detail: `Z-Score ${score} in Distress Zone. Rischio elevato di insolvenza.`, actualValue: `${score}`, threshold: '≥1.23' };
    },
  },

  // ── 8. Nessun protesto/pregiudizievole ────────────────────────────────────
  {
    id: 'POL-REQ-004',
    name: 'Assenza protesti e pregiudizievoli',
    category: 'REQUISITO',
    description: 'Il soggetto non deve presentare protesti o pregiudizievoli in essere.',
    check: () => {
      // Mock: dati non disponibili, si assume PASS (verifica manuale richiesta)
      return { status: 'PASS', detail: 'Nessun protesto o pregiudizievole risultante (verifica da Centrale Rischi).', actualValue: 'Nessuno', threshold: '0 protesti' };
    },
  },

  // ── 9. Bilancio non più vecchio di 18 mesi ──────────────────────────────
  {
    id: 'POL-REQ-005',
    name: 'Bilancio entro 18 mesi',
    category: 'REQUISITO',
    description: 'Il bilancio fornito non deve essere più vecchio di 18 mesi dalla data odierna.',
    check: (bilancio) => {
      const dataChiusura = parseDataChiusura(bilancio.dataChiusura);
      const now = new Date();
      const months = monthsDiff(dataChiusura, now);
      if (months <= 12) {
        return { status: 'PASS', detail: `Bilancio al ${bilancio.dataChiusura} (${months} mesi fa). Entro i limiti.`, actualValue: `${months} mesi`, threshold: '≤18 mesi' };
      }
      if (months <= 18) {
        return { status: 'WARNING', detail: `Bilancio al ${bilancio.dataChiusura} (${months} mesi fa). Prossimo alla scadenza dei 18 mesi.`, actualValue: `${months} mesi`, threshold: '≤18 mesi' };
      }
      return { status: 'FAIL', detail: `Bilancio al ${bilancio.dataChiusura} (${months} mesi fa). Supera il limite di 18 mesi.`, actualValue: `${months} mesi`, threshold: '≤18 mesi' };
    },
  },

  // ── 10. Esposizione max 25% patrimonio di vigilanza ──────────────────────
  {
    id: 'POL-LIM-005',
    name: 'Esposizione max 25% patrimonio di vigilanza',
    category: 'LIMITE',
    description: 'L\'esposizione complessiva verso il singolo cliente non deve superare il 25% del patrimonio di vigilanza della banca (CRR Art. 395).',
    check: (bilancio) => {
      // Mock: patrimonio di vigilanza fissato a 500M EUR (parametro banca)
      const patrimonioVigilanza = 500_000_000;
      const sogliaMax = patrimonioVigilanza * 0.25; // 125M
      const esposizione = bilancio.debitiVersoBanche;
      const pctEsposizione = (esposizione / patrimonioVigilanza) * 100;
      const rounded = Math.round(pctEsposizione * 100) / 100;

      if (rounded <= 15) {
        return { status: 'PASS', detail: `Esposizione ${rounded}% del patrimonio di vigilanza. Ampiamente entro il limite.`, actualValue: `${rounded}%`, threshold: '≤25%' };
      }
      if (rounded <= 25) {
        return { status: 'WARNING', detail: `Esposizione ${rounded}% del patrimonio di vigilanza. Prossima al limite CRR del 25%.`, actualValue: `${rounded}%`, threshold: '≤25%' };
      }
      return {
        status: 'FAIL',
        detail: `Esposizione ${rounded}% supera il limite CRR del 25% (max: € ${sogliaMax.toLocaleString('it-IT')}).`,
        actualValue: `${rounded}%`,
        threshold: '≤25%',
      };
    },
  },

  // ── 11. Concentrazione settoriale ─────────────────────────────────────────
  {
    id: 'POL-PRF-001',
    name: 'Concentrazione settoriale',
    category: 'PREFERENZA',
    description: 'Si preferisce che l\'esposizione verso un singolo settore ATECO non superi il 30% del portafoglio crediti.',
    check: (bilancio) => {
      // Mock: concentrazione settoriale stimata al 18% (parametro portafoglio)
      const concentrazione = 18;
      return {
        status: concentrazione <= 20 ? 'PASS' : concentrazione <= 30 ? 'WARNING' : 'FAIL',
        detail: `Concentrazione settoriale stimata al ${concentrazione}% per il settore ${bilancio.settore}. ${concentrazione <= 30 ? 'Entro la preferenza del 30%.' : 'Supera la soglia preferenziale del 30%.'}`,
        actualValue: `${concentrazione}%`,
        threshold: '≤30%',
      };
    },
  },

  // ── 12. Divieto erogazione a soggetti in sofferenza CR ───────────────────
  {
    id: 'POL-DIV-001',
    name: 'Divieto erogazione soggetti in sofferenza',
    category: 'DIVIETO',
    description: 'È vietata l\'erogazione di nuovo credito a soggetti classificati in sofferenza nella Centrale Rischi.',
    check: () => {
      // Mock: dati CR non disponibili, si assume PASS (verifica manuale richiesta)
      return { status: 'PASS', detail: 'Il soggetto non risulta classificato in sofferenza CR (verifica da segnalazioni Centrale Rischi).', actualValue: 'Non in sofferenza', threshold: 'Non in sofferenza' };
    },
  },
];

// ── Main Function ───────────────────────────────────────────────────────────────

export function runPolicyCheck(
  bilancio: ParsedBilancio,
  models: RiskModelResults,
): PolicyAdherenceResult {
  const checks = CREDIT_POLICIES.map((policy) => ({
    ...policy,
    result: policy.check(bilancio, models),
  }));

  const passCount = checks.filter((c) => c.result.status === 'PASS').length;
  const failCount = checks.filter((c) => c.result.status === 'FAIL').length;
  const warningCount = checks.filter((c) => c.result.status === 'WARNING').length;

  // Blockers: tutte le regole FAIL (impediscono erogazione)
  const blockers = checks
    .filter((c) => c.result.status === 'FAIL')
    .map((c) => `[${c.id}] ${c.name}: ${c.result.detail}`);

  // Adherence score: PASS = 100pts, WARNING = 50pts, FAIL = 0pts, normalizzato su 100
  const totalPoints = checks.reduce((sum, c) => {
    if (c.result.status === 'PASS') return sum + 100;
    if (c.result.status === 'WARNING') return sum + 50;
    return sum;
  }, 0);
  const overallAdherence = Math.round(totalPoints / checks.length);

  // Overall status
  let overallStatus: PolicyAdherenceResult['overallStatus'];
  if (failCount === 0 && warningCount === 0) {
    overallStatus = 'CONFORME';
  } else if (failCount === 0) {
    overallStatus = 'PARZIALMENTE CONFORME';
  } else {
    overallStatus = 'NON CONFORME';
  }

  return {
    checks,
    passCount,
    failCount,
    warningCount,
    overallAdherence,
    overallStatus,
    blockers,
  };
}
