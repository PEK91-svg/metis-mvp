// ─── Client-Side Bilancio Parser ──────────────────────────────────────────────
// Parses Italian financial statements from text files into structured data.
// Supports both minimal (like Bilancio_NanoBanana.txt) and extended formats.

import { ParsedBilancio } from './types';

/** Extract a numeric value from a line like "Ricavi: € 2.450.000" or "EBITDA: 300000" */
function extractNumber(text: string): number {
  // Remove currency symbols, percentage indicators, 'x' suffix
  const cleaned = text
    .replace(/€/g, '')
    .replace(/%/g, '')
    .replace(/x$/i, '')
    .trim();

  // Handle Italian number format: 2.450.000 or 2.450.000,50
  // First check if it uses Italian formatting (dots as thousands, comma as decimal)
  const italianMatch = cleaned.match(/([\d.]+,?\d*)/);
  if (italianMatch) {
    const numStr = italianMatch[1]
      .replace(/\./g, '') // Remove thousands separator (dots)
      .replace(',', '.'); // Convert decimal comma to dot
    const val = parseFloat(numStr);
    return isNaN(val) ? 0 : val;
  }

  // Fallback: try plain number
  const plainMatch = cleaned.match(/([\d,]+\.?\d*)/);
  if (plainMatch) {
    const val = parseFloat(plainMatch[1].replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
  }

  return 0;
}

/** Extract percentage from text like "12.2%" or "(12.2%)" */
function extractPercentage(text: string): number {
  const match = text.match(/([\d.,]+)\s*%/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

/** Find a line matching a pattern and extract the numeric value */
function findValue(lines: string[], patterns: string[]): number {
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        // Split on ':' or '=' and take the value part
        const parts = line.split(/[:=]/);
        if (parts.length >= 2) {
          return extractNumber(parts.slice(1).join(':'));
        }
        // If no separator, try to extract number from the whole line
        return extractNumber(line);
      }
    }
  }
  return 0;
}

/** Find a string value for a field */
function findString(lines: string[], patterns: string[], fallback: string = ''): string {
  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        const parts = line.split(/[:=]/);
        if (parts.length >= 2) {
          return parts.slice(1).join(':').trim();
        }
      }
    }
  }
  return fallback;
}

/** Main parser function */
export function parseBilancio(rawText: string): ParsedBilancio {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);

  // Company info
  const companyName = lines[0]?.trim() || 'Azienda Sconosciuta';
  const partitaIva = findString(lines, ['partita iva', 'p.iva', 'piva', 'cod. fiscale'], '00000000000');
  const settore = findString(lines, ['settore', 'attività', 'codice ateco'], 'Non specificato');

  // Extract data chiusura
  const dataLine = lines.find(l => l.toLowerCase().includes('bilancio al') || l.toLowerCase().includes('chiusura'));
  const dataMatch = dataLine?.match(/(\d{2}\/\d{2}\/\d{4})/);
  const dataChiusura = dataMatch ? dataMatch[1] : '31/12/2025';

  // Conto Economico
  const ricavi = findValue(lines, ['ricavi', 'fatturato', 'revenue', 'vendite', 'valore della produzione']);
  const costiOperativi = findValue(lines, ['costi operativi', 'costi della produzione', 'costi totali', 'opex']);
  const ebitda = findValue(lines, ['ebitda', 'margine operativo lordo', 'mol']);
  const ammortamenti = findValue(lines, ['ammortamenti', 'depreciation', 'ammortamento', 'amm.ti']);
  const oneriFinanziari = findValue(lines, ['oneri finanziari', 'interessi passivi', 'financial expenses', 'interessi']);
  const imposte = findValue(lines, ['imposte', 'tasse', 'taxes', 'ires', 'irap']);

  // EBITDA margin: try explicit, then calculate
  let ebitdaMargin = 0;
  const ebitdaLine = lines.find(l => l.toLowerCase().includes('ebitda'));
  if (ebitdaLine) {
    ebitdaMargin = extractPercentage(ebitdaLine);
  }
  if (ebitdaMargin === 0 && ricavi > 0 && ebitda > 0) {
    ebitdaMargin = (ebitda / ricavi) * 100;
  }

  // Derived CE values
  const ebit = ebitda > 0 ? ebitda - ammortamenti : findValue(lines, ['ebit', 'risultato operativo']);
  const risultatoLordo = ebit - oneriFinanziari;
  const utileNetto = findValue(lines, ['utile netto', 'risultato netto', 'net income', 'risultato d\'esercizio']) || (risultatoLordo - imposte);

  // Stato Patrimoniale — Attivo
  const totaleAttivo = findValue(lines, ['totale attivo', 'total assets', 'attivo totale', 'totale attività']);
  const attivoCorrenti = findValue(lines, ['attivo corrente', 'current assets', 'attività correnti']);
  const cassa = findValue(lines, ['cassa', 'disponibilità liquide', 'cash', 'liquidità']);
  const crediti = findValue(lines, ['crediti', 'accounts receivable', 'crediti commerciali', 'crediti verso clienti']);
  const rimanenze = findValue(lines, ['rimanenze', 'inventory', 'magazzino']);
  const attivoFisso = findValue(lines, ['attivo fisso', 'immobilizzazioni', 'fixed assets']) || (totaleAttivo - attivoCorrenti);

  // Stato Patrimoniale — Passivo
  const totalePassivo = findValue(lines, ['totale passivo', 'total liabilities', 'passivo totale']) || totaleAttivo;
  const passivoCorrenti = findValue(lines, ['passivo corrente', 'current liabilities', 'passività correnti', 'debiti a breve']);
  const debitiVersoBanche = findValue(lines, ['debiti verso banche', 'bank debt', 'debiti bancari', 'debiti v/banche']);
  const debitiBreveTermine = findValue(lines, ['debiti breve termine', 'short-term debt', 'debiti a breve']) || passivoCorrenti;
  const debitiLungoTermine = findValue(lines, ['debiti lungo termine', 'long-term debt', 'debiti a lungo', 'debiti m/l termine']);
  const patrimonioNetto = findValue(lines, ['patrimonio netto', 'equity', 'net worth', 'mezzi propri']);
  const capitaleSociale = findValue(lines, ['capitale sociale', 'share capital']);
  const utiliPortati = findValue(lines, ['utili portati', 'riserve', 'retained earnings', 'utili a nuovo']);

  // Derived values
  const totaleDebiti = debitiVersoBanche + debitiBreveTermine + debitiLungoTermine || (totalePassivo - patrimonioNetto);
  const capitaleDiLavoro = attivoCorrenti - passivoCorrenti;
  const utiliNonDistribuiti = utiliPortati || utileNetto; // Use retained earnings or current year profit

  // Estimates for missing values needed by models
  // If totaleAttivo is 0, estimate from ricavi (typical asset turnover ~1.5x for Italian SMEs)
  const estimatedTotaleAttivo = totaleAttivo || (ricavi > 0 ? ricavi / 1.2 : 1000000);
  const estimatedAttivoCorrenti = attivoCorrenti || estimatedTotaleAttivo * 0.45;
  const estimatedPassivoCorrenti = passivoCorrenti || estimatedTotaleAttivo * 0.30;
  const estimatedPatrimonioNetto = patrimonioNetto || estimatedTotaleAttivo * 0.30;
  const estimatedTotaleDebiti = totaleDebiti || (estimatedTotaleAttivo - estimatedPatrimonioNetto);

  // Debt service: assume ~15% annual repayment of bank debt + interest
  const debtService = findValue(lines, ['servizio del debito', 'debt service', 'rate finanziarie']) ||
    (debitiVersoBanche * 0.15 + oneriFinanziari) || (debitiVersoBanche * 0.15);

  // Market value equity: for private companies, estimate as 1.5x Book Value
  const valoreAzioneMercato = findValue(lines, ['valore di mercato', 'market cap', 'capitalizzazione']) ||
    (estimatedPatrimonioNetto * 1.5);

  return {
    companyName,
    partitaIva: partitaIva.replace(/[^0-9]/g, '') || '00000000000',
    settore,
    dataChiusura,
    ricavi,
    costiOperativi: costiOperativi || (ricavi - ebitda),
    ebitda,
    ebitdaMargin: Math.round(ebitdaMargin * 100) / 100,
    ammortamenti,
    ebit: ebit || ebitda,
    oneriFinanziari,
    risultatoLordo,
    imposte,
    utileNetto,
    totaleAttivo: estimatedTotaleAttivo,
    attivoCorrenti: estimatedAttivoCorrenti,
    cassa,
    crediti,
    rimanenze,
    attivoFisso: attivoFisso || (estimatedTotaleAttivo - estimatedAttivoCorrenti),
    totalePassivo: estimatedTotaleAttivo, // Assets = Liabilities + Equity
    passivoCorrenti: estimatedPassivoCorrenti,
    debitiVersoBanche,
    debitiBreveTermine: debitiBreveTermine || estimatedPassivoCorrenti,
    debitiLungoTermine,
    totaleDebiti: estimatedTotaleDebiti,
    patrimonioNetto: estimatedPatrimonioNetto,
    capitaleSociale,
    utiliPortati,
    capitaleDiLavoro: (estimatedAttivoCorrenti - estimatedPassivoCorrenti),
    utiliNonDistribuiti: utiliNonDistribuiti || utileNetto,
    fatturato: ricavi,
    valoreAzioneMercato,
    debtService: debtService || 1, // Avoid division by zero
  };
}

/** Read a text file from a File object */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsText(file, 'UTF-8');
  });
}
