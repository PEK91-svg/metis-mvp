"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { loadPratiche } from '@/lib/storage';
import type { Pratica } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = 'APPROVATA' | 'IN ANALISI' | 'DA REVISIONARE' | 'SOSPESA' | 'RIFIUTATA';
type RiskLevel = 'BASSO' | 'MEDIO' | 'ALTO' | 'CRITICO';

interface Company {
  id: number;
  name: string;
  piva: string;
  pd: number;
  altman: number;
  status: Status;
  risk: RiskLevel;
  operator: string;
  updated: string;
  created: string;
  sector: string;
  revenue: number;
}

interface Notification {
  id: number;
  type: 'warning' | 'info' | 'danger' | 'success';
  message: string;
  time: string;
  read: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const OPERATORS = ['M. Rossi', 'L. Bianchi', 'G. Verdi', 'A. Neri', 'S. Russo'];

const mockCompanies: Company[] = [
  { id: 1,  name: 'Alpha S.p.A.',        piva: 'IT12345678901', pd: 2.1,  altman: 3.12, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-18', created: '2025-01-15', sector: 'Manifatturiero', revenue: 15400000 },
  { id: 2,  name: 'Beta Ltd.',           piva: 'IT98765432109', pd: 3.5,  altman: 2.85, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'L. Bianchi', updated: '2025-03-17', created: '2025-02-10', sector: 'Servizi',        revenue: 8200000 },
  { id: 3,  name: 'Gamma SRL',           piva: 'IT11223344556', pd: 1.8,  altman: 3.45, status: 'DA REVISIONARE', risk: 'BASSO',   operator: 'G. Verdi',   updated: '2025-03-16', created: '2025-01-22', sector: 'Tech',           revenue: 22100000 },
  { id: 4,  name: 'Delta Corp.',         piva: 'IT99887766554', pd: 5.2,  altman: 1.95, status: 'SOSPESA',        risk: 'ALTO',    operator: 'A. Neri',    updated: '2025-03-15', created: '2025-02-05', sector: 'Edilizia',       revenue: 4500000 },
  { id: 5,  name: 'Epsilon S.r.l.',      piva: 'IT55443322110', pd: 0.9,  altman: 4.10, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-14', created: '2025-01-08', sector: 'Alimentare',     revenue: 31000000 },
  { id: 6,  name: 'Zeta Industries',     piva: 'IT66778899001', pd: 7.8,  altman: 1.45, status: 'RIFIUTATA',      risk: 'CRITICO', operator: 'S. Russo',   updated: '2025-03-13', created: '2025-03-01', sector: 'Manifatturiero', revenue: 2100000 },
  { id: 7,  name: 'Eta Holding',         piva: 'IT22334455667', pd: 1.5,  altman: 3.80, status: 'APPROVATA',      risk: 'BASSO',   operator: 'L. Bianchi', updated: '2025-03-12', created: '2025-01-20', sector: 'Servizi',        revenue: 45000000 },
  { id: 8,  name: 'Theta Finance',       piva: 'IT33445566778', pd: 4.1,  altman: 2.20, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'G. Verdi',   updated: '2025-03-11', created: '2025-02-18', sector: 'Finanza',        revenue: 12800000 },
  { id: 9,  name: 'Iota Tech',           piva: 'IT44556677889', pd: 2.8,  altman: 2.95, status: 'DA REVISIONARE', risk: 'MEDIO',   operator: 'A. Neri',    updated: '2025-03-10', created: '2025-02-25', sector: 'Tech',           revenue: 9700000 },
  { id: 10, name: 'Kappa Logistics',     piva: 'IT55667788990', pd: 6.3,  altman: 1.60, status: 'SOSPESA',        risk: 'ALTO',    operator: 'S. Russo',   updated: '2025-03-09', created: '2025-01-30', sector: 'Trasporti',      revenue: 6300000 },
  { id: 11, name: 'Lambda Group',        piva: 'IT66778800112', pd: 1.2,  altman: 3.95, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-08', created: '2025-01-12', sector: 'Alimentare',     revenue: 28500000 },
  { id: 12, name: 'Mu Pharma',           piva: 'IT77889911223', pd: 3.2,  altman: 2.70, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'L. Bianchi', updated: '2025-03-07', created: '2025-03-05', sector: 'Pharma',         revenue: 18000000 },
  { id: 13, name: 'Nu Energy',           piva: 'IT88990022334', pd: 8.5,  altman: 1.10, status: 'RIFIUTATA',      risk: 'CRITICO', operator: 'G. Verdi',   updated: '2025-03-06', created: '2025-02-15', sector: 'Energia',        revenue: 3400000 },
  { id: 14, name: 'Xi Construction',     piva: 'IT99001133445', pd: 4.8,  altman: 2.05, status: 'DA REVISIONARE', risk: 'ALTO',    operator: 'A. Neri',    updated: '2025-03-05', created: '2025-02-20', sector: 'Edilizia',       revenue: 7600000 },
  { id: 15, name: 'Omicron Digital',     piva: 'IT00112244556', pd: 1.0,  altman: 4.25, status: 'APPROVATA',      risk: 'BASSO',   operator: 'S. Russo',   updated: '2025-03-04', created: '2025-01-05', sector: 'Tech',           revenue: 52000000 },
  { id: 16, name: 'Pi Consulting',       piva: 'IT11223355667', pd: 2.5,  altman: 3.10, status: 'IN ANALISI',     risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-03', created: '2025-03-02', sector: 'Servizi',        revenue: 5200000 },
  { id: 17, name: 'Rho Automotive',      piva: 'IT22334466778', pd: 5.9,  altman: 1.75, status: 'SOSPESA',        risk: 'ALTO',    operator: 'L. Bianchi', updated: '2025-03-02', created: '2025-02-08', sector: 'Automotive',     revenue: 14200000 },
  { id: 18, name: 'Sigma Textiles',      piva: 'IT33445577889', pd: 3.8,  altman: 2.50, status: 'DA REVISIONARE', risk: 'MEDIO',   operator: 'G. Verdi',   updated: '2025-03-01', created: '2025-01-28', sector: 'Manifatturiero', revenue: 11000000 },
];

const mockNotifications: Notification[] = [
  { id: 1, type: 'danger',  message: 'Zeta Industries: PD oltre soglia critica (7.8%)',     time: '2 min fa',  read: false },
  { id: 2, type: 'warning', message: 'Delta Corp.: pratica sospesa da oltre 15 giorni',     time: '1 ora fa',  read: false },
  { id: 3, type: 'info',    message: 'Mu Pharma: nuova documentazione caricata',            time: '3 ore fa',  read: false },
  { id: 4, type: 'success', message: 'Lambda Group: approvazione completata',                time: '5 ore fa',  read: true },
  { id: 5, type: 'warning', message: 'Kappa Logistics: Altman Z-score sotto 1.8',           time: '1 giorno fa', read: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { color: string; icon: string; border: string; bg: string; text: string }> = {
  'APPROVATA':      { color: 'green',  icon: '✓', border: 'border-green/50',  bg: 'bg-green/10',  text: 'text-green' },
  'IN ANALISI':     { color: 'cyan',   icon: '◎', border: 'border-cyan/50',   bg: 'bg-cyan/10',   text: 'text-cyan' },
  'DA REVISIONARE': { color: 'yellow', icon: '⚠', border: 'border-yellow/50', bg: 'bg-yellow/10', text: 'text-yellow' },
  'SOSPESA':        { color: 'purple', icon: '⏸', border: 'border-purple/50', bg: 'bg-purple/10', text: 'text-purple' },
  'RIFIUTATA':      { color: 'red',    icon: '✕', border: 'border-red/50',    bg: 'bg-red/10',    text: 'text-red' },
};

const RISK_CONFIG: Record<RiskLevel, { border: string; bg: string; text: string }> = {
  'BASSO':   { border: 'border-green/50',  bg: 'bg-green/10',  text: 'text-green' },
  'MEDIO':   { border: 'border-yellow/50', bg: 'bg-yellow/10', text: 'text-yellow' },
  'ALTO':    { border: 'border-red/40',    bg: 'bg-red/10',    text: 'text-red' },
  'CRITICO': { border: 'border-red/70',    bg: 'bg-red/20',    text: 'text-red' },
};

type SortKey = 'name' | 'pd' | 'altman' | 'status' | 'updated' | 'risk' | 'revenue';
type SortDir = 'asc' | 'desc';

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(0)}K`;
  return `€${val}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StatusDistributionChart({ companies }: { companies: Company[] }) {
  const total = companies.length || 1;
  const counts: Record<Status, number> = {
    'APPROVATA': 0, 'IN ANALISI': 0, 'DA REVISIONARE': 0, 'SOSPESA': 0, 'RIFIUTATA': 0,
  };
  companies.forEach(c => counts[c.status]++);

  const bars: { status: Status; count: number; pct: number }[] = (Object.keys(counts) as Status[]).map(s => ({
    status: s, count: counts[s], pct: (counts[s] / total) * 100,
  }));

  const colorMap: Record<Status, string> = {
    'APPROVATA': '#00FF66', 'IN ANALISI': '#00E5FF', 'DA REVISIONARE': '#FACC15', 'SOSPESA': '#7B2CBF', 'RIFIUTATA': '#FF0055',
  };

  return (
    <div className="flex-1 h-full bg-black/40 border border-white/10 shadow-lg rounded-xl p-5 relative overflow-hidden group hover:border-cyan/30 transition-all duration-300">
      <h3 className="text-[10px] uppercase tracking-wider text-cyan font-semibold font-[var(--font-space)] mb-3">Distribuzione Stati</h3>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-black/30 mb-3">
        {bars.filter(b => b.count > 0).map(b => (
          <div key={b.status} style={{ width: `${b.pct}%`, backgroundColor: colorMap[b.status] }} className="transition-all duration-500" title={`${b.status}: ${b.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {bars.map(b => (
          <div key={b.status} className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap[b.status] }} />
            <span className="text-text-muted">{b.status}</span>
            <span className="text-white font-semibold">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskDistributionChart({ companies }: { companies: Company[] }) {
  const total = companies.length || 1;
  const counts: Record<RiskLevel, number> = { 'BASSO': 0, 'MEDIO': 0, 'ALTO': 0, 'CRITICO': 0 };
  companies.forEach(c => counts[c.risk]++);

  const riskColors: Record<RiskLevel, string> = {
    'BASSO': '#00FF66', 'MEDIO': '#FACC15', 'ALTO': '#FF0055', 'CRITICO': '#FF0055',
  };

  return (
    <div className="flex-1 h-full bg-black/40 border border-white/10 shadow-lg rounded-xl p-5 relative overflow-hidden group hover:border-yellow/30 transition-all duration-300">
      <h3 className="text-[10px] uppercase tracking-wider text-cyan font-semibold font-[var(--font-space)] mb-3">Distribuzione Rischio</h3>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(counts) as RiskLevel[]).map(r => {
          const pct = (counts[r] / total) * 100;
          return (
            <div key={r} className="flex flex-col items-center gap-1">
              <div className="w-full h-16 bg-black/30 rounded-md relative overflow-hidden flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all duration-700"
                  style={{ height: `${Math.max(pct, 5)}%`, backgroundColor: riskColors[r], opacity: r === 'CRITICO' ? 0.8 : 0.6 }}
                />
              </div>
              <span className="text-[10px] text-text-muted uppercase">{r}</span>
              <span className="text-xs font-bold" style={{ color: riskColors[r] }}>{counts[r]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PDTrendMiniChart({ companies }: { companies: Company[] }) {
  const sorted = [...companies].sort((a, b) => a.pd - b.pd);
  const max = Math.max(...companies.map(c => c.pd), 1);
  const step = 100 / (sorted.length || 1);

  const points = sorted.map((c, i) => ({
    x: i * step + step / 2,
    y: 100 - (c.pd / max) * 80 - 10,
    pd: c.pd,
    name: c.name,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex-1 h-full bg-black/40 border border-white/10 shadow-lg rounded-xl p-5 relative overflow-hidden group hover:border-cyan/30 transition-all duration-300">
      <h3 className="text-[10px] uppercase tracking-wider text-cyan font-semibold font-[var(--font-space)] mb-3">PD Distribution</h3>
      <svg viewBox="0 0 100 60" className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={`${pathD} L ${points[points.length - 1]?.x ?? 0} 55 L ${points[0]?.x ?? 0} 55 Z`} fill="url(#pdGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#00E5FF" strokeWidth="0.8" />
        {/* Danger threshold */}
        <line x1="0" y1={100 - (5 / max) * 80 - 10} x2="100" y2={100 - (5 / max) * 80 - 10} stroke="#FF0055" strokeWidth="0.3" strokeDasharray="2 2" opacity="0.5" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={p.pd > 5 ? '#FF0055' : '#00E5FF'} />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-text-muted mt-1">
        <span>Min: {Math.min(...companies.map(c => c.pd)).toFixed(1)}%</span>
        <span className="text-red/60">Soglia: 5.0%</span>
        <span>Max: {Math.max(...companies.map(c => c.pd)).toFixed(1)}%</span>
      </div>
    </div>
  );
}

// Quick actions dropdown
function QuickActions({ company, onAction }: { company: Company; onAction: (action: string, company: Company) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const actions = [
    { label: 'Apri Dossier', icon: '📂', key: 'open' },
    { label: 'Assegna Operatore', icon: '👤', key: 'assign' },
    { label: 'Cambia Stato', icon: '🔄', key: 'status' },
    { label: 'Archivia', icon: '📦', key: 'archive' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition text-sm"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 glass-panel border border-white/10 py-1 min-w-[180px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {actions.map(a => (
            <button
              key={a.key}
              onClick={() => { onAction(a.key, company); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-white hover:bg-white/5 transition flex items-center gap-2"
            >
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Notification panel
function NotificationPanel({ notifications, open, onClose, onMarkRead }: {
  notifications: Notification[];
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: number) => void;
}) {
  if (!open) return null;

  const typeColors: Record<string, string> = {
    danger: 'border-l-red bg-red/5', warning: 'border-l-yellow bg-yellow/5',
    info: 'border-l-cyan bg-cyan/5', success: 'border-l-green bg-green/5',
  };

  return (
    <div className="absolute right-6 top-14 z-50 w-96 glass-panel border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <span className="text-xs uppercase tracking-wider text-cyan font-semibold">Notifiche</span>
        <button onClick={onClose} className="text-text-muted hover:text-white text-sm">✕</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => onMarkRead(n.id)}
            className={`p-3 border-b border-white/5 border-l-2 cursor-pointer hover:bg-white/5 transition ${typeColors[n.type]} ${n.read ? 'opacity-50' : ''}`}
          >
            <p className="text-xs text-white leading-relaxed">{n.message}</p>
            <span className="text-[10px] text-text-muted mt-1 block">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sort indicator
function SortIndicator({ sortKey, currentKey, dir }: { sortKey: SortKey; currentKey: SortKey; dir: SortDir }) {
  if (sortKey !== currentKey) return <span className="text-white/20 ml-1">↕</span>;
  return <span className="text-cyan ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PortafoglioDashboard() {
  const router = useRouter();
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pdMin, setPdMin] = useState('');
  const [pdMax, setPdMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Notifications
  const [notifications, setNotifications] = useState(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);

  // Data: merge localStorage pratiche with mock data
  const [companies, setCompanies] = useState(mockCompanies);

  useEffect(() => {
    const stored = loadPratiche();
    if (stored.length > 0) {
      // Convert stored pratiche to Company format and merge
      const fromStorage: Company[] = stored.map((p: Pratica, idx: number) => ({
        id: 100 + idx,
        name: p.name,
        piva: p.piva,
        pd: p.pd,
        altman: p.altman,
        status: p.status as Status,
        risk: p.risk as RiskLevel,
        operator: p.operator,
        updated: p.updated.slice(0, 10),
        created: p.created.slice(0, 10),
        sector: p.sector,
        revenue: p.revenue,
      }));
      // Merge: stored first, then mock (avoiding duplicates by name)
      const storedNames = new Set(fromStorage.map(c => c.name));
      const merged = [...fromStorage, ...mockCompanies.filter(c => !storedNames.has(c.name))];
      setCompanies(merged);
    }
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.piva.includes(search) && !c.sector.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (riskFilter && c.risk !== riskFilter) return false;
      if (operatorFilter && c.operator !== operatorFilter) return false;
      if (dateFrom && c.updated < dateFrom) return false;
      if (dateTo && c.updated > dateTo) return false;
      if (pdMin && c.pd < parseFloat(pdMin)) return false;
      if (pdMax && c.pd > parseFloat(pdMax)) return false;
      return true;
    });
  }, [companies, search, statusFilter, riskFilter, operatorFilter, dateFrom, dateTo, pdMin, pdMax]);

  // Sorted data
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'pd': cmp = a.pd - b.pd; break;
        case 'altman': cmp = a.altman - b.altman; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'updated': cmp = a.updated.localeCompare(b.updated); break;
        case 'risk': { const order: Record<RiskLevel, number> = { BASSO: 0, MEDIO: 1, ALTO: 2, CRITICO: 3 }; cmp = order[a.risk] - order[b.risk]; break; }
        case 'revenue': cmp = a.revenue - b.revenue; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Paginated data
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  // Handlers
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }, [sortKey]);

  const handleAction = useCallback((action: string, company: Company) => {
    // In a real app, these would trigger API calls
    console.log(`Action: ${action} on ${company.name}`);
  }, []);

  const handleMarkRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Azienda', 'P.IVA', 'PD%', 'Altman', 'Stato', 'Rischio', 'Operatore', 'Aggiornato', 'Settore', 'Fatturato'];
    const rows = filtered.map(c => [c.name, c.piva, c.pd, c.altman, c.status, c.risk, c.operator, c.updated, c.sector, c.revenue]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metis-pratiche-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setRiskFilter(''); setOperatorFilter('');
    setDateFrom(''); setDateTo(''); setPdMin(''); setPdMax('');
    setPage(1);
  };

  const activeFilterCount = [statusFilter, riskFilter, operatorFilter, dateFrom, dateTo, pdMin, pdMax].filter(Boolean).length;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden text-[13px] tracking-wide animate-[fadeUp_0.5s_ease-out_forwards] bg-[#050505] relative">
      {/* Ambient background matching dossier */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,229,255,0.08),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(123,44,191,0.08),_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="relative flex-1 flex flex-col p-6 overflow-auto custom-scrollbar">
          {/* Header */}
          <header className="flex items-center justify-end mb-5">
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-cyan/30 hover:bg-cyan/5 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-[9px] text-white rounded-full flex items-center justify-center font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel notifications={notifications} open={showNotifications} onClose={() => setShowNotifications(false)} onMarkRead={handleMarkRead} />
            </div>
          </header>

          {/* Toggle Search Bar Button (Visible when hidden) */}
          <div className="flex justify-between items-end border-b border-glass-border pb-5 mb-5 shrink-0 z-20 relative">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_var(--color-cyan)] animate-pulse" />
                <div className="font-space text-[9px] text-cyan uppercase tracking-[0.3em] font-bold opacity-80">Metis Core // Active Session</div>
              </div>
              <h1 className="font-space text-3xl font-bold tracking-tighter text-white flex items-baseline gap-4">
                Portafoglio Creditizio 
                <span className="text-cyan/40 text-sm font-mono tracking-widest font-normal">VOL_{filtered.length}</span>
              </h1>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10 hover:border-cyan/50 text-white transition-all shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span className="font-space text-xs font-semibold uppercase tracking-widest">{showAdvancedFilters ? "Nascondi Toolbar" : "Toolbar di Ricerca"}</span>
            </button>
          </div>

          {/* Analytical Modules - Bento Box Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="animate-[fadeUp_0.5s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
              <StatusDistributionChart companies={filtered} />
            </div>
            <div className="animate-[fadeUp_0.5s_ease-out_forwards]" style={{ animationDelay: '0.3s' }}>
              <RiskDistributionChart companies={filtered} />
            </div>
            <div className="animate-[fadeUp_0.5s_ease-out_forwards]" style={{ animationDelay: '0.5s' }}>
              <PDTrendMiniChart companies={filtered} />
            </div>
          </div>

          {/* Collapsible Search + Filters Bar */}
          <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative z-30 ${showAdvancedFilters ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'}`}>
            <div className="overflow-hidden">
              <div className="glass-panel p-3 flex flex-col gap-4 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl rounded-xl">
                
                {/* Main Row */}
                <div className="flex items-center justify-between gap-4">
                  {/* Search Input with Autocomplete */}
                  <div className="relative w-80 group">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Cerca p.iva, azienda..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition font-space"
                    />
                    
                    {/* Autocomplete Dropdown */}
                    {search.length > 0 && !companies.some(c => c.name.toLowerCase() === search.toLowerCase()) && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-[#0A0F14] border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-y-auto hidden group-focus-within:block z-50">
                        {companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                          <div 
                            key={c.id}
                            onMouseDown={() => router.push(`/pratica?id=${c.id}`)}
                            className="px-4 py-3 border-b border-white/5 hover:bg-cyan/10 cursor-pointer flex justify-between items-center transition"
                          >
                            <span className="text-sm font-space text-white">{c.name}</span>
                            <span className="text-[10px] font-space text-text-muted">{c.piva}</span>
                          </div>
                        ))}
                        {companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-xs text-text-muted font-space italic">Nessun risultato trovato</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Filters */}
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                      className="bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan/50 transition font-space appearance-none pr-8 cursor-pointer relative"
                      style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300E5FF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundPosition: "right 8px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                    >
                      <option value="">Tutti gli stati</option>
                      {(Object.keys(STATUS_CONFIG) as Status[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    <select
                      value={riskFilter}
                      onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
                      className="bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan/50 transition font-space appearance-none pr-8 cursor-pointer"
                      style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300E5FF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundPosition: "right 8px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                    >
                      <option value="">Tutti i rischi</option>
                      {(Object.keys(RISK_CONFIG) as RiskLevel[]).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <button
                      onClick={clearFilters}
                      className="text-[11px] font-space text-text-muted hover:text-red hover:bg-red/10 px-3 py-2 rounded-lg transition ml-auto border border-transparent hover:border-red/30 tracking-widest font-semibold uppercase"
                    >
                      Reset
                    </button>
                    {(search || statusFilter || riskFilter || operatorFilter || dateFrom || dateTo || pdMin || pdMax) && (
                      <span className="text-[10px] text-cyan font-space uppercase tracking-widest">Filtri Attivi</span>
                    )}
                  </div>

                  {/* Results Count & Export */}
                  <div className="flex items-center gap-4 shrink-0 border-l border-white/10 pl-4">
                    <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2">
                       <span className="font-space text-lg text-cyan font-bold">{filtered.length}</span>
                       <span className="text-[11px] text-text-muted ml-2 font-space uppercase tracking-widest">di {companies.length} pratiche</span>
                    </div>
                    <button
                      onClick={exportCSV}
                      className="w-10 h-10 rounded-lg bg-black/30 border border-white/10 hover:bg-cyan/10 hover:border-cyan/30 text-white/50 hover:text-cyan flex items-center justify-center transition"
                      title="Esporta CSV"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </div>
                </div>

                {/* Advanced Row (Always visible when main toolbar is open) */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Operatore</label>
                      <select
                        value={operatorFilter}
                        onChange={(e) => { setOperatorFilter(e.target.value); setPage(1); }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan/50 transition font-space"
                      >
                        <option value="">Tutti</option>
                        {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Data da</label>
                      <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan/50 transition font-space [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Data a</label>
                      <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan/50 transition font-space [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">PD min (%)</label>
                      <input type="number" step="0.1" value={pdMin} onChange={(e) => { setPdMin(e.target.value); setPage(1); }}
                        placeholder="0.0"
                        className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition font-space" />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">PD max (%)</label>
                      <input type="number" step="0.1" value={pdMax} onChange={(e) => { setPdMax(e.target.value); setPage(1); }}
                        placeholder="100.0"
                        className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition font-space" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto bg-black/40 border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] mt-4 animate-[fadeUp_0.5s_ease-out_forwards]" style={{ animationDelay: '0.7s' }}>
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-black/60 border-b border-white/10">
                  {([
                    { key: 'name' as SortKey, label: 'Azienda', w: '' },
                    { key: 'pd' as SortKey, label: 'PD', w: 'w-20' },
                    { key: 'altman' as SortKey, label: 'Altman Z', w: 'w-20' },
                    { key: 'risk' as SortKey, label: 'Rischio', w: 'w-24' },
                    { key: 'status' as SortKey, label: 'Stato', w: 'w-32' },
                    { key: 'revenue' as SortKey, label: 'Fatturato', w: 'w-28' },
                    { key: 'updated' as SortKey, label: 'Aggiornato', w: 'w-28' },
                  ]).map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-6 py-4 text-left text-[11px] text-[#00E5FF] uppercase tracking-wider cursor-pointer hover:text-white transition select-none font-[var(--font-space)] ${col.w}`}
                    >
                      {col.label}
                      <SortIndicator sortKey={col.key} currentKey={sortKey} dir={sortDir} />
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-[11px] text-[#00E5FF] uppercase tracking-wider font-[var(--font-space)] w-20">Operatore</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                      Nessuna pratica trovata con i filtri selezionati.
                    </td>
                  </tr>
                ) : paginated.map((c, idx) => {
                  const stCfg = STATUS_CONFIG[c.status];
                  const rCfg = RISK_CONFIG[c.risk];
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-white/5 ${idx % 2 === 0 ? 'bg-black/20' : ''} hover:bg-white/5 transition group`}
                    >
                      <td className="px-6 py-4">
                        <Link href={`/pratica?id=${c.id}`} className="text-[#00E5FF] hover:text-white transition text-sm font-semibold tracking-wide">
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-white/40 mt-1">{c.piva} · {c.sector}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-[var(--font-space)] ${c.pd > 5 ? 'text-red-400' : c.pd > 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {c.pd.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-[var(--font-space)] ${c.altman < 1.8 ? 'text-red-400' : c.altman < 2.7 ? 'text-yellow-400' : 'text-white'}`}>
                          {c.altman.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border ${rCfg.border} ${rCfg.bg} ${rCfg.text}`}>
                          {c.risk}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border ${stCfg.border} ${stCfg.bg} ${stCfg.text}`}>
                          <span>{stCfg.icon}</span> {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 font-[var(--font-space)]">{formatCurrency(c.revenue)}</td>
                      <td className="px-6 py-4 text-xs text-white/50">{formatDate(c.updated)}</td>
                      <td className="px-6 py-4 text-xs text-white/70">{c.operator}</td>
                      <td className="px-6 py-4">
                        <QuickActions company={c} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-[#0A0F14] border border-white/10 rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/50">Righe per pagina:</span>
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="bg-black/40 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]/50 appearance-none pr-8 cursor-pointer"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2300E5FF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundPosition: "right 6px center", backgroundRepeat: "no-repeat", backgroundSize: "12px" }}
                >
                  {[5, 10, 25].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-sm text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-medium transition-all ${
                      p === page
                        ? 'border-[#00E5FF]/50 text-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                        : 'border-white/5 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-sm text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all"
                >
                  ›
                </button>
              </div>

              <div className="text-sm font-[var(--font-space)] bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-white/50">
                Pagina <span className="text-[#00E5FF]">{page}</span> di {totalPages}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
