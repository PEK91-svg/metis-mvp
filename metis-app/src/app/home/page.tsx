"use client";
import Link from 'next/link';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface Company {
  id: number;
  name: string;
  piva: string;
  pd: string;
  altman: string;
  status: string;
  updated: string;
}

const mockCompanies: Company[] = [
  { id: 1, name: 'Alpha S.p.A.', piva: 'IT12345678901', pd: '2.1%', altman: '3.12', status: 'APPROVATA', updated: '2024-11-01' },
  { id: 2, name: 'Beta Ltd.', piva: 'IT98765432109', pd: '3.5%', altman: '2.85', status: 'IN ANALISI', updated: '2024-10-28' },
  { id: 3, name: 'Gamma SRL', piva: 'IT11223344556', pd: '1.8%', altman: '3.45', status: 'DA REVISIONARE', updated: '2024-10-30' },
];

const KPI_CARDS = (total: number, inAnalysis: number, approved: number, avgPD: string) => [
  { label: 'Pratiche Totali', value: total, cls: 'border-cyan/30 text-cyan bg-cyan/10' },
  { label: 'In Analisi', value: inAnalysis, cls: 'border-purple/30 text-purple bg-purple/10' },
  { label: 'Approvate', value: approved, cls: 'border-green/30 text-green bg-green/10' },
  { label: 'PD medio', value: avgPD, cls: 'border-yellow/30 text-yellow bg-yellow/10' },
];

export default function HomeDashboard() {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companies] = useState(mockCompanies);

  const filtered = companies.filter((c) => {
    const matchesName = c.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesName && matchesStatus;
  });

  const total = companies.length;
  const inAnalysis = companies.filter((c) => c.status === 'IN ANALISI').length;
  const approved = companies.filter((c) => c.status === 'APPROVATA').length;
  const avgPD = (
    companies.reduce((sum, c) => sum + parseFloat(c.pd.replace('%', '')), 0) / total
  ).toFixed(2) + '%';

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-[rgba(9,13,20,0.85)] backdrop-blur-xl p-6 overflow-auto">
        {/* KPI Bar */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {KPI_CARDS(total, inAnalysis, approved, avgPD).map((kpi, i) => (
            <div key={i} className={`glass-panel flex flex-col items-center justify-center p-4 border ${kpi.cls}`}>
              <span className="text-sm uppercase tracking-wider text-text-muted">{kpi.label}</span>
              <span className="text-2xl font-bold mt-1">{kpi.value}</span>
            </div>
          ))}
        </section>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Cerca azienda…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-64 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan/50"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-purple/50"
          >
            <option value="">Tutti gli stati</option>
            <option value="APPROVATA">Approvata</option>
            <option value="IN ANALISI">In Analisi</option>
            <option value="DA REVISIONARE">Da Revisionare</option>
            <option value="SOSPESA">Sospesa</option>
          </select>
          <Link href="/" className="ml-auto">
            <button className="flex items-center gap-2 bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/30 rounded-lg px-4 py-2 text-sm font-medium transition">
              + Nuova Pratica
            </button>
          </Link>
        </div>

        {/* Company Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-black/30">
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">Azienda</th>
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">P.IVA</th>
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">PD</th>
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">Altman</th>
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">Stato</th>
                <th className="px-4 py-2 text-left text-xs text-text-muted uppercase">Aggiornato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`glass-panel border-b border-glass-border ${idx % 2 === 0 ? 'bg-black/20' : ''} hover:bg-black/30 transition`}
                >
                  <td className="px-4 py-2">
                    <Link href="/" className="text-cyan hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-sm text-text-muted">{c.piva}</td>
                  <td className="px-4 py-2 text-sm">{c.pd}</td>
                  <td className="px-4 py-2 text-sm">{c.altman}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      c.status === 'APPROVATA'
                        ? 'border-green/50 text-green bg-green/10'
                        : c.status === 'IN ANALISI'
                        ? 'border-cyan/50 text-cyan bg-cyan/10'
                        : c.status === 'DA REVISIONARE'
                        ? 'border-yellow/50 text-yellow bg-yellow/10'
                        : 'border-white/20 text-text-muted bg-white/5'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-text-muted">{c.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
