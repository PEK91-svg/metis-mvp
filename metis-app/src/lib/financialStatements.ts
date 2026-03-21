// ─── Financial Statements Generator ───────────────────────────────────────────
// Generates GAAP-style Income Statement, Balance Sheet, and Cash Flow Statement
// from ParsedBilancio data. All calculations are deterministic and auditable.

import {
  ParsedBilancio,
  FinancialStatements,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  FinancialLineItem,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function line(label: string, value: number, opts?: Partial<FinancialLineItem>): FinancialLineItem {
  return { label, value, ...opts };
}

function safeDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round((a / b) * 10000) / 100; // percentage with 2 decimals
}

// ── Income Statement (Conto Economico) ──────────────────────────────────────
function generateIncomeStatement(b: ParsedBilancio): IncomeStatement {
  const costoDelVenduto = b.costiOperativi * 0.7; // stima: 70% dei costi operativi
  const costiGenerali = b.costiOperativi * 0.3;
  const margineLordo = b.ricavi - costoDelVenduto;
  const altriRicavi = 0; // dal bilancio non emerge, placeholder
  const altriCosti = 0;
  const risultatoPrimaImposte = b.ebit - b.oneriFinanziari + altriRicavi - altriCosti;

  const lines: FinancialLineItem[] = [
    line('Ricavi delle vendite', b.ricavi, { isSubtotal: true }),
    line('Costo del venduto', -costoDelVenduto, { indent: 1 }),
    line('Margine Lordo', margineLordo, { isSubtotal: true, note: `${safeDiv(margineLordo, b.ricavi)}%` }),
    line('Costi generali e amministrativi', -costiGenerali, { indent: 1 }),
    line('EBITDA (Margine Operativo Lordo)', b.ebitda, { isSubtotal: true, note: `${b.ebitdaMargin.toFixed(1)}%` }),
    line('Ammortamenti e svalutazioni', -b.ammortamenti, { indent: 1 }),
    line('EBIT (Risultato Operativo)', b.ebit, { isSubtotal: true, note: `${safeDiv(b.ebit, b.ricavi)}%` }),
    line('Oneri finanziari', -b.oneriFinanziari, { indent: 1 }),
    line('Risultato prima delle imposte', risultatoPrimaImposte, { isSubtotal: true }),
    line('Imposte sul reddito', -b.imposte, { indent: 1 }),
    line('Utile (Perdita) Netto', b.utileNetto, { isTotal: true, note: `${safeDiv(b.utileNetto, b.ricavi)}%` }),
  ];

  return {
    periodo: b.dataChiusura,
    lines,
    margins: {
      gross: safeDiv(margineLordo, b.ricavi),
      operating: safeDiv(b.ebit, b.ricavi),
      net: safeDiv(b.utileNetto, b.ricavi),
      ebitda: b.ebitdaMargin,
    },
  };
}

// ── Balance Sheet (Stato Patrimoniale) ──────────────────────────────────────
function generateBalanceSheet(b: ParsedBilancio): BalanceSheet {
  const altriAttiviCorrenti = Math.max(0, b.attivoCorrenti - b.cassa - b.crediti - b.rimanenze);
  const altriPassiviCorrenti = Math.max(0, b.passivoCorrenti - b.debitiBreveTermine);
  const riserveUtili = Math.max(0, b.patrimonioNetto - b.capitaleSociale - b.utiliPortati);

  const attivo: FinancialLineItem[] = [
    line('ATTIVITÀ CORRENTI', b.attivoCorrenti, { isSubtotal: true }),
    line('Disponibilità liquide', b.cassa, { indent: 1 }),
    line('Crediti commerciali', b.crediti, { indent: 1 }),
    line('Rimanenze', b.rimanenze, { indent: 1 }),
    ...(altriAttiviCorrenti > 0 ? [line('Altri attivi correnti', altriAttiviCorrenti, { indent: 1 })] : []),
    line('ATTIVITÀ NON CORRENTI', b.attivoFisso, { isSubtotal: true }),
    line('Immobilizzazioni materiali e immateriali', b.attivoFisso, { indent: 1 }),
    line('TOTALE ATTIVO', b.totaleAttivo, { isTotal: true }),
  ];

  const passivo: FinancialLineItem[] = [
    line('PASSIVITÀ CORRENTI', b.passivoCorrenti, { isSubtotal: true }),
    line('Debiti a breve termine', b.debitiBreveTermine, { indent: 1 }),
    ...(altriPassiviCorrenti > 0 ? [line('Altre passività correnti', altriPassiviCorrenti, { indent: 1 })] : []),
    line('PASSIVITÀ NON CORRENTI', b.debitiLungoTermine, { isSubtotal: true }),
    line('Debiti a medio/lungo termine', b.debitiLungoTermine, { indent: 1 }),
    line('Debiti verso banche', b.debitiVersoBanche, { indent: 1 }),
    line('TOTALE DEBITI', b.totaleDebiti, { isSubtotal: true }),
    line('PATRIMONIO NETTO', b.patrimonioNetto, { isSubtotal: true }),
    line('Capitale sociale', b.capitaleSociale, { indent: 1 }),
    line('Utili portati a nuovo', b.utiliPortati, { indent: 1 }),
    ...(riserveUtili > 0 ? [line('Riserve e altri fondi', riserveUtili, { indent: 1 })] : []),
    line('TOTALE PASSIVO E NETTO', b.totalePassivo, { isTotal: true }),
  ];

  return { periodo: b.dataChiusura, attivo, passivo };
}

// ── Cash Flow Statement (Rendiconto Finanziario — Metodo Indiretto) ─────────
function generateCashFlow(b: ParsedBilancio): CashFlowStatement {
  // Metodo indiretto: partendo dall'utile netto
  const cashFromOperations = b.utileNetto + b.ammortamenti;
  // Stima variazioni working capital (assunzione: no dati multi-periodo → stima conservativa)
  const varCrediti = -(b.crediti * 0.05); // stima aumento crediti del 5%
  const varRimanenze = -(b.rimanenze * 0.03); // stima aumento rimanenze del 3%
  const varDebFornitori = b.passivoCorrenti * 0.04; // stima aumento debiti fornitori del 4%
  const varWorkingCapital = varCrediti + varRimanenze + varDebFornitori;
  const totaleOperativo = cashFromOperations + varWorkingCapital;

  // Investimenti (stima basata su ammortamenti — reinvestimento ~80%)
  const capex = -(b.ammortamenti * 0.8);
  const totaleInvestimento = capex;

  // Finanziamento
  const rimborsoDebiti = -(b.debtService - b.oneriFinanziari); // quota capitale del debt service
  const nuovoIndebitamento = 0; // non disponibile senza multi-anno
  const totaleFinanziamento = rimborsoDebiti + nuovoIndebitamento;

  const totale = totaleOperativo + totaleInvestimento + totaleFinanziamento;

  const operativo: FinancialLineItem[] = [
    line('Utile netto', b.utileNetto),
    line('Ammortamenti e svalutazioni', b.ammortamenti),
    line('Variazione crediti commerciali', varCrediti, { note: 'Stima' }),
    line('Variazione rimanenze', varRimanenze, { note: 'Stima' }),
    line('Variazione debiti fornitori', varDebFornitori, { note: 'Stima' }),
    line('Cash Flow Operativo', totaleOperativo, { isSubtotal: true }),
  ];

  const investimento: FinancialLineItem[] = [
    line('Investimenti (CAPEX)', capex, { note: 'Stima su ammortamenti' }),
    line('Cash Flow da Investimenti', totaleInvestimento, { isSubtotal: true }),
  ];

  const finanziamento: FinancialLineItem[] = [
    line('Rimborso debiti finanziari', rimborsoDebiti),
    line('Cash Flow da Finanziamento', totaleFinanziamento, { isSubtotal: true }),
  ];

  return {
    periodo: b.dataChiusura,
    operativo,
    investimento,
    finanziamento,
    totale: Math.round(totale),
  };
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function generateFinancialStatements(bilancio: ParsedBilancio): FinancialStatements {
  return {
    incomeStatement: generateIncomeStatement(bilancio),
    balanceSheet: generateBalanceSheet(bilancio),
    cashFlow: generateCashFlow(bilancio),
  };
}
