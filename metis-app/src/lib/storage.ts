// ─── localStorage Persistence Layer ───────────────────────────────────────────
// Manages storage of Dossiers, Pratiche, and Delibere.

import { Dossier, Pratica, Delibera } from './types';
import { estimatePD } from './riskModels';

const KEYS = {
  dossiers: 'metis_dossiers',
  pratiche: 'metis_pratiche',
  delibere: 'metis_delibere',
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    console.warn('localStorage write failed — storage may be full');
  }
}

// ── Dossier CRUD ──────────────────────────────────────────────────────────────
export function loadDossiers(): Dossier[] {
  return load<Dossier>(KEYS.dossiers);
}

export function saveDossier(dossier: Dossier): void {
  const dossiers = loadDossiers();
  const idx = dossiers.findIndex(d => d.id === dossier.id);
  if (idx >= 0) {
    dossiers[idx] = dossier;
  } else {
    dossiers.unshift(dossier);
  }
  save(KEYS.dossiers, dossiers);

  // Also update the pratica summary
  savePraticaFromDossier(dossier);
}

export function getDossier(id: string): Dossier | null {
  const dossiers = loadDossiers();
  return dossiers.find(d => d.id === id) || null;
}

export function deleteDossier(id: string): void {
  const dossiers = loadDossiers().filter(d => d.id !== id);
  save(KEYS.dossiers, dossiers);
  const pratiche = loadPratiche().filter(p => p.dossierId !== id);
  save(KEYS.pratiche, pratiche);
}

// ── Pratiche (summary list) ───────────────────────────────────────────────────
export function loadPratiche(): Pratica[] {
  return load<Pratica>(KEYS.pratiche);
}

function savePraticaFromDossier(dossier: Dossier): void {
  const pratiche = loadPratiche();
  const pd = estimatePD(dossier.riskModels);

  // Determine risk level from PD
  let risk: Pratica['risk'];
  if (pd < 2) risk = 'BASSO';
  else if (pd < 5) risk = 'MEDIO';
  else if (pd < 8) risk = 'ALTO';
  else risk = 'CRITICO';

  const pratica: Pratica = {
    id: dossier.id,
    name: dossier.companyName,
    piva: dossier.partitaIva,
    pd,
    altman: dossier.riskModels.altman.score,
    status: dossier.status,
    risk,
    operator: dossier.operatore,
    updated: dossier.updatedAt,
    created: dossier.createdAt,
    sector: dossier.settore,
    revenue: dossier.bilancio.ricavi,
    dossierId: dossier.id,
  };

  const idx = pratiche.findIndex(p => p.id === pratica.id);
  if (idx >= 0) {
    pratiche[idx] = pratica;
  } else {
    pratiche.unshift(pratica);
  }
  save(KEYS.pratiche, pratiche);
}

// ── Delibere ──────────────────────────────────────────────────────────────────
export function loadDelibere(): Delibera[] {
  return load<Delibera>(KEYS.delibere);
}

export function saveDelibera(delibera: Delibera): void {
  const delibere = loadDelibere();
  delibere.unshift(delibera);
  save(KEYS.delibere, delibere);

  // Update dossier status
  const dossier = getDossier(delibera.dossierId);
  if (dossier) {
    dossier.delibera = delibera;
    dossier.status = delibera.esito === 'APPROVATA' ? 'APPROVATA' :
                     delibera.esito === 'INTEGRAZIONE' ? 'DA REVISIONARE' : 'RIFIUTATA';
    dossier.updatedAt = delibera.timestamp;
    saveDossier(dossier);
  }
}

// ── Generate Dossier ID ───────────────────────────────────────────────────────
export function generateDossierId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PEF-${year}-${rand}`;
}

// ── Clear all data ────────────────────────────────────────────────────────────
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('metis_audit_log');
}
