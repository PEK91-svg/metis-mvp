"use client";
import Link from 'next/link';
import { useState } from 'react';

interface Company {
  id: number;
  name: string;
  piva: string;
  pd: string;
  altman: string;
  status: string;
  updated: string;
}

// Mock data for companies – in real app this would come from an API
const mockCompanies: Company[] = [
  { id: 1, name: 'Alpha S.p.A.', piva: 'IT12345678901', pd: '2.1%', altman: '3.12', status: 'APPROVATA', updated: '2024-11-01' },
  { id: 2, name: 'Beta Ltd.', piva: 'IT98765432109', pd: '3.5%', altman: '2.85', status: 'IN ANALISI', updated: '2024-10-28' },
  { id: 3, name: 'Gamma SRL', piva: 'IT11223344556', pd: '1.8%', altman: '3.45', status: 'DA REVISIONARE', updated: '2024-10-30' },
  // ...more rows can be added
];

export default function HomeDashboard() {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companies, setCompanies] = useState(mockCompanies);

  // Simple client‑side filtering
  const filtered = companies.filter((c) => {
    const matchesName = c.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesName && matchesStatus;
  });

  // KPI aggregation (totals from mock data)
  const total = companies.length;
  const inAnalysis = companies.filter((c) => c.status === 'IN ANALISI').length;
  const approved = companies.filter((c) => c.status === 'APPROVATA').length;
  const avgPD = (
    companies.reduce((sum, c) => sum + parseFloat(c.pd.replace('%', '')), 0) / total
  ).toFixed(2) + '%';

  return (
    <main className="flex flex-col h-screen w-screen bg-[rgba(9,13,20,0.85)] backdrop-blur-xl p-6 overflow-auto">
      {/* KPI Bar */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pratiche Totali', value: total, color: 'cyan' },
          { label: 'In Analisi', value: inAnalysis, color: 'purple' },
          { label: 'Approvate', value: approved, color: 'green' },
          { label: 'PD medio', value: avgPD, color: 'yellow' },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`glass-panel flex flex-col items-center justify-center p-4 border-${kpi.color}-500/30 text-${kpi.color} bg-${kpi.color}/10`}
          >
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
                  <Link href={`/dossier/${c.id}`} className="text-cyan hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-sm text-text-muted">{c.piva}</td>
                <td className="px-4 py-2 text-sm">{c.pd}</td>
                <td className="px-4 py-2 text-sm">{c.altman}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      c.status === 'APPROVATA'
                        ? 'border-green-500 text-green-500 bg-green/10'
                        : c.status === 'IN ANALISI'
                        ? 'border-cyan-500 text-cyan-500 bg-cyan/10'
                        : c.status === 'DA REVISIONARE'
                        ? 'border-yellow-500 text-yellow-500 bg-yellow/10'
                        : 'border-gray-500 text-gray-500 bg-gray/10'
                    }`}
                  >
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
  );
}
