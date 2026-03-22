"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { loadPratiche } from '@/lib/storage';
import type { Pratica } from '@/lib/types';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { STATUS_CONFIG, RISK_CONFIG } from '@/lib/companyConfig';
import type { Status, RiskLevel } from '@/lib/companyConfig';

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
  { id: 1,  name: 'Alpha S.p.A.',        piva: 'IT00000000001', pd: 2.1,  altman: 3.12, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-18', created: '2025-01-15', sector: 'Manifatturiero', revenue: 15400000 },
  { id: 2,  name: 'Beta Ltd.',           piva: 'IT00000000002', pd: 3.5,  altman: 2.85, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'L. Bianchi', updated: '2025-03-17', created: '2025-02-10', sector: 'Servizi',        revenue: 8200000 },
  { id: 3,  name: 'Gamma SRL',           piva: 'IT00000000003', pd: 1.8,  altman: 3.45, status: 'DA REVISIONARE', risk: 'BASSO',   operator: 'G. Verdi',   updated: '2025-03-16', created: '2025-01-22', sector: 'Tech',           revenue: 22100000 },
  { id: 4,  name: 'Delta Corp.',         piva: 'IT00000000004', pd: 5.2,  altman: 1.95, status: 'SOSPESA',        risk: 'ALTO',    operator: 'A. Neri',    updated: '2025-03-15', created: '2025-02-05', sector: 'Edilizia',       revenue: 4500000 },
  { id: 5,  name: 'Epsilon S.r.l.',      piva: 'IT00000000005', pd: 0.9,  altman: 4.10, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-14', created: '2025-01-08', sector: 'Alimentare',     revenue: 31000000 },
  { id: 6,  name: 'Zeta Industries',     piva: 'IT00000000006', pd: 7.8,  altman: 1.45, status: 'RIFIUTATA',      risk: 'CRITICO', operator: 'S. Russo',   updated: '2025-03-13', created: '2025-03-01', sector: 'Manifatturiero', revenue: 2100000 },
  { id: 7,  name: 'Eta Holding',         piva: 'IT00000000007', pd: 1.5,  altman: 3.80, status: 'APPROVATA',      risk: 'BASSO',   operator: 'L. Bianchi', updated: '2025-03-12', created: '2025-01-20', sector: 'Servizi',        revenue: 45000000 },
  { id: 8,  name: 'Theta Finance',       piva: 'IT00000000008', pd: 4.1,  altman: 2.20, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'G. Verdi',   updated: '2025-03-11', created: '2025-02-18', sector: 'Finanza',        revenue: 12800000 },
  { id: 9,  name: 'Iota Tech',           piva: 'IT00000000009', pd: 2.8,  altman: 2.95, status: 'DA REVISIONARE', risk: 'MEDIO',   operator: 'A. Neri',    updated: '2025-03-10', created: '2025-02-25', sector: 'Tech',           revenue: 9700000 },
  { id: 10, name: 'Kappa Logistics',     piva: 'IT00000000010', pd: 6.3,  altman: 1.60, status: 'SOSPESA',        risk: 'ALTO',    operator: 'S. Russo',   updated: '2025-03-09', created: '2025-01-30', sector: 'Trasporti',      revenue: 6300000 },
  { id: 11, name: 'Lambda Group',        piva: 'IT00000000011', pd: 1.2,  altman: 3.95, status: 'APPROVATA',      risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-08', created: '2025-01-12', sector: 'Alimentare',     revenue: 28500000 },
  { id: 12, name: 'Mu Pharma',           piva: 'IT00000000012', pd: 3.2,  altman: 2.70, status: 'IN ANALISI',     risk: 'MEDIO',   operator: 'L. Bianchi', updated: '2025-03-07', created: '2025-03-05', sector: 'Pharma',         revenue: 18000000 },
  { id: 13, name: 'Nu Energy',           piva: 'IT00000000013', pd: 8.5,  altman: 1.10, status: 'RIFIUTATA',      risk: 'CRITICO', operator: 'G. Verdi',   updated: '2025-03-06', created: '2025-02-15', sector: 'Energia',        revenue: 3400000 },
  { id: 14, name: 'Xi Construction',     piva: 'IT00000000014', pd: 4.8,  altman: 2.05, status: 'DA REVISIONARE', risk: 'ALTO',    operator: 'A. Neri',    updated: '2025-03-05', created: '2025-02-20', sector: 'Edilizia',       revenue: 7600000 },
  { id: 15, name: 'Omicron Digital',     piva: 'IT00000000015', pd: 1.0,  altman: 4.25, status: 'APPROVATA',      risk: 'BASSO',   operator: 'S. Russo',   updated: '2025-03-04', created: '2025-01-05', sector: 'Tech',           revenue: 52000000 },
  { id: 16, name: 'Pi Consulting',       piva: 'IT00000000016', pd: 2.5,  altman: 3.10, status: 'IN ANALISI',     risk: 'BASSO',   operator: 'M. Rossi',   updated: '2025-03-03', created: '2025-03-02', sector: 'Servizi',        revenue: 5200000 },
  { id: 17, name: 'Rho Automotive',      piva: 'IT00000000017', pd: 5.9,  altman: 1.75, status: 'SOSPESA',        risk: 'ALTO',    operator: 'L. Bianchi', updated: '2025-03-02', created: '2025-02-08', sector: 'Automotive',     revenue: 14200000 },
  { id: 18, name: 'Sigma Textiles',      piva: 'IT00000000018', pd: 3.8,  altman: 2.50, status: 'DA REVISIONARE', risk: 'MEDIO',   operator: 'G. Verdi',   updated: '2025-03-01', created: '2025-01-28', sector: 'Manifatturiero', revenue: 11000000 },
];

const mockNotifications: Notification[] = [
  { id: 1, type: 'danger',  message: 'Zeta Industries: PD oltre soglia critica (7.8%)',     time: '2 min fa',  read: false },
  { id: 2, type: 'warning', message: 'Delta Corp.: pratica sospesa da oltre 15 giorni',     time: '1 ora fa',  read: false },
  { id: 3, type: 'info',    message: 'Mu Pharma: nuova documentazione caricata',            time: '3 ore fa',  read: false },
  { id: 4, type: 'success', message: 'Lambda Group: approvazione completata',                time: '5 ore fa',  read: true },
  { id: 5, type: 'warning', message: 'Kappa Logistics: Altman Z-score sotto 1.8',           time: '1 giorno fa', read: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
    <div className="glass-panel p-4">
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
    <div className="glass-panel p-4">
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
    <div className="glass-panel p-4">
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
export default function HomeDashboard() {
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

  // Dynamic KPIs
  const kpis = useMemo(() => {
    const total = companies.length;
    const inAnalysis = companies.filter(c => c.status === 'IN ANALISI').length;
    const approved = companies.filter(c => c.status === 'APPROVATA').length;
    const rejected = companies.filter(c => c.status === 'RIFIUTATA').length;
    const highRisk = companies.filter(c => c.risk === 'ALTO' || c.risk === 'CRITICO').length;
    const avgPD = total > 0 ? companies.reduce((s, c) => s + c.pd, 0) / total : 0;
    const avgAltman = total > 0 ? companies.reduce((s, c) => s + c.altman, 0) / total : 0;
    const totalRevenue = companies.reduce((s, c) => s + c.revenue, 0);

    return { total, inAnalysis, approved, rejected, highRisk, avgPD, avgAltman, totalRevenue };
  }, [companies]);

  // Handlers
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return key;
    });
    setPage(1);
  }, []);

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
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-[#0f1211] overflow-hidden relative">
        {/* Ambient background matching prototype */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(27,41,33,0.5),_transparent_80%),radial-gradient(ellipse_at_bottom_right,_rgba(12,25,18,0.8),_transparent_80%)] pointer-events-none" />

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

          {/* Header */}
          <div className="flex justify-between items-end mb-4 z-20 relative">
            <h1 className="text-2xl font-space font-bold text-white tracking-widest uppercase">Command Center</h1>
          </div>

          {/* Dynamic Drag and Drop Dashboard */}
          <DashboardGrid data={kpis} />
        </div>
      </main>
    </div>
  );
}
