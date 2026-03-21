"use client";
import { useState } from 'react';
import { DeliberaEsito, Delibera } from '@/lib/types';

interface DeliberaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (delibera: { esito: DeliberaEsito; motivazione: string }) => void;
  companyName: string;
  dossierId: string;
}

export default function DeliberaModal({ open, onClose, onSubmit, companyName, dossierId }: DeliberaModalProps) {
  const [esito, setEsito] = useState<DeliberaEsito | null>(null);
  const [motivazione, setMotivazione] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (!esito) {
      setError('Selezionare un esito prima di procedere.');
      return;
    }
    if (!motivazione.trim()) {
      setError('La motivazione è obbligatoria per la delibera.');
      return;
    }
    setError('');
    onSubmit({ esito, motivazione: motivazione.trim() });
    setEsito(null);
    setMotivazione('');
  };

  const esitoConfig: Record<DeliberaEsito, { label: string; icon: string; color: string; hoverBg: string; borderColor: string; bgActive: string }> = {
    'APPROVATA': { label: 'APPROVA PEF', icon: '✓', color: 'text-green', hoverBg: 'hover:bg-green/10', borderColor: 'border-green/40', bgActive: 'bg-green/20 border-green/60' },
    'INTEGRAZIONE': { label: 'RICHIEDI INTEGRAZIONI', icon: '⏳', color: 'text-yellow', hoverBg: 'hover:bg-yellow/10', borderColor: 'border-yellow/40', bgActive: 'bg-yellow/20 border-yellow/60' },
    'RIFIUTATA': { label: 'DECLINA PRATICA', icon: '✕', color: 'text-red', hoverBg: 'hover:bg-red/10', borderColor: 'border-red/40', bgActive: 'bg-red/20 border-red/60' },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-[550px] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-[var(--font-space)] text-sm uppercase tracking-wider text-cyan font-semibold">Delibera Comitato</h2>
              <p className="text-[11px] text-text-muted mt-1">{companyName} — {dossierId}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white text-sm transition p-1 rounded hover:bg-white/5">✕</button>
          </div>
        </div>

        {/* Esito Selection */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2 font-[var(--font-space)]">Esito Delibera</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(esitoConfig) as [DeliberaEsito, typeof esitoConfig[DeliberaEsito]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setEsito(key); setError(''); }}
                  className={`p-3 rounded-lg border text-center transition ${
                    esito === key ? cfg.bgActive : `border-white/10 ${cfg.hoverBg}`
                  }`}
                >
                  <div className={`text-xl mb-1 ${cfg.color}`}>{cfg.icon}</div>
                  <div className={`text-[10px] font-[var(--font-space)] font-semibold tracking-wider ${esito === key ? cfg.color : 'text-text-muted'}`}>
                    {cfg.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Motivazione */}
          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-2 font-[var(--font-space)]">
              Motivazione <span className="text-red">*</span>
            </label>
            <textarea
              value={motivazione}
              onChange={(e) => { setMotivazione(e.target.value); setError(''); }}
              placeholder="Inserire la motivazione della delibera..."
              className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition min-h-[100px] resize-none"
            />
          </div>

          {error && (
            <div className="text-[11px] text-red bg-red/10 border border-red/30 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Operatore & Timestamp */}
          <div className="flex items-center justify-between text-[10px] text-text-muted bg-black/20 rounded-lg px-3 py-2">
            <span>Operatore: M. Rossi</span>
            <span>{new Date().toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-white transition">Annulla</button>
          <button
            onClick={handleSubmit}
            className="bg-purple hover:bg-[#8e3bd6] text-white font-[var(--font-space)] font-semibold px-6 py-2.5 rounded-lg shadow-[0_0_15px_rgba(123,44,191,0.3)] tracking-wider text-xs transition"
          >
            CONFERMA DELIBERA
          </button>
        </div>

        {/* EU AI Act disclaimer */}
        <div className="px-5 pb-4">
          <p className="text-[9px] text-purple/50 text-center leading-relaxed">
            EU AI Act: Questo è un supporto decisionale. L&apos;operatore umano è responsabile finale della delibera.
          </p>
        </div>
      </div>
    </div>
  );
}
