// ─── Audit Trail System ───────────────────────────────────────────────────────
// In-memory logging with persistence to localStorage.
// Every action is timestamped, attributed to an operator, and immutable.

import { AuditEntry, AuditAction } from './types';

const STORAGE_KEY = 'metis_audit_log';
const DEFAULT_OPERATOR = 'M. Rossi'; // Current session operator

let auditLog: AuditEntry[] = [];

/** Generate unique ID */
function generateId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/** Load audit log from localStorage */
export function loadAuditLog(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      auditLog = JSON.parse(stored);
    }
  } catch {
    auditLog = [];
  }
  return auditLog;
}

/** Save audit log to localStorage */
function saveAuditLog(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLog));
  } catch {
    // localStorage full or unavailable
  }
}

/** Add an entry to the audit log */
export function addAuditEntry(
  action: AuditAction,
  details: string,
  dossierId?: string,
  operator: string = DEFAULT_OPERATOR,
  metadata?: Record<string, unknown>
): AuditEntry {
  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    operator,
    details,
    dossierId,
    metadata,
  };

  auditLog.unshift(entry); // Newest first
  saveAuditLog();
  return entry;
}

/** Get all audit entries, optionally filtered by dossierId */
export function getAuditLog(dossierId?: string): AuditEntry[] {
  if (dossierId) {
    return auditLog.filter(e => e.dossierId === dossierId);
  }
  return [...auditLog];
}

/** Clear audit log (admin only) */
export function clearAuditLog(): void {
  auditLog = [];
  saveAuditLog();
}

/** Action display config */
export const AUDIT_ACTION_CONFIG: Record<AuditAction, { label: string; icon: string; color: string }> = {
  'UPLOAD_FILE': { label: 'Upload File', icon: '📄', color: 'cyan' },
  'PARSE_BILANCIO': { label: 'Parsing Bilancio', icon: '🔍', color: 'cyan' },
  'CALCOLO_MODELLI': { label: 'Calcolo Modelli', icon: '📊', color: 'purple' },
  'GENERAZIONE_NARRATIVE': { label: 'Generazione Narrative', icon: '✍️', color: 'purple' },
  'BENCHMARK_CONFRONTO': { label: 'Benchmark Settoriale', icon: '📈', color: 'cyan' },
  'DELIBERA_APPROVATA': { label: 'Pratica Approvata', icon: '✅', color: 'green' },
  'DELIBERA_INTEGRAZIONE': { label: 'Richiesta Integrazione', icon: '⏳', color: 'yellow' },
  'DELIBERA_RIFIUTATA': { label: 'Pratica Rifiutata', icon: '❌', color: 'red' },
  'EXPORT_PDF': { label: 'Export PDF', icon: '📋', color: 'cyan' },
  'DOSSIER_CREATO': { label: 'Dossier Creato', icon: '📁', color: 'green' },
  'DOSSIER_AGGIORNATO': { label: 'Dossier Aggiornato', icon: '🔄', color: 'cyan' },
  'FINANCIAL_STATEMENTS': { label: 'Financial Statements', icon: '📑', color: 'cyan' },
  'VARIANCE_ANALYSIS': { label: 'Variance Analysis', icon: '📉', color: 'yellow' },
  'ANOMALY_DETECTION': { label: 'Anomaly Detection', icon: '🚨', color: 'red' },
  'FAIRNESS_CHECK': { label: 'Fairness & Bias Check', icon: '⚖️', color: 'purple' },
};
