// ─── Centralized Status Config ────────────────────────────────────────────────
// Unica fonte di verità per la mappatura status → classi Tailwind.
// Usato da CCIIPanel, EBAPanel e altri componenti che mostrano semafori normativi.

import type { CCIIStatus } from './cciiCompliance';
import type { EBAStatus } from './ebaCompliance';

export interface StatusStyle {
  color: string;
  bg: string;
  border: string;
  dot: string;
  label: string;
}

export function getCCIIStatusStyle(s: CCIIStatus): StatusStyle {
  switch (s) {
    case 'PASS':
      return { color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/30',  dot: 'bg-green shadow-[0_0_6px_var(--color-green)]',                    label: 'PASS'      };
    case 'WARNING':
      return { color: 'text-yellow', bg: 'bg-yellow/10', border: 'border-yellow/30', dot: 'bg-yellow shadow-[0_0_6px_var(--color-yellow)]',                   label: 'ATTENZIONE' };
    case 'ALERT':
      return { color: 'text-red',    bg: 'bg-red/10',    border: 'border-red/30',    dot: 'bg-red shadow-[0_0_6px_var(--color-red)] animate-pulse',            label: 'ALLERTA'   };
    default:
      return { color: 'text-text-muted', bg: 'bg-white/5', border: 'border-glass-border', dot: 'bg-white/30', label: 'N/A' };
  }
}

export function getEBAStatusStyle(s: EBAStatus): StatusStyle {
  switch (s) {
    case 'CONFORME':
      return { color: 'text-green',      bg: 'bg-green/10',  border: 'border-green/30',  dot: 'bg-green',                    label: 'CONFORME'       };
    case 'PARZIALMENTE CONFORME':
      return { color: 'text-yellow',     bg: 'bg-yellow/10', border: 'border-yellow/30', dot: 'bg-yellow',                   label: 'PARZ. CONFORME' };
    case 'NON CONFORME':
      return { color: 'text-red',        bg: 'bg-red/10',    border: 'border-red/30',    dot: 'bg-red animate-pulse',         label: 'NON CONFORME'   };
    default:
      return { color: 'text-text-muted', bg: 'bg-white/5',   border: 'border-glass-border', dot: 'bg-white/20',              label: 'DA VERIFICARE'  };
  }
}
