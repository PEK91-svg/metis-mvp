"use client";

import { useState, useRef, useCallback } from "react";

interface KeyDataItem {
  label: string;
  value: string;
}

interface SynthesisResult {
  summary: string;
  keyData: KeyDataItem[];
  redFlags: string[];
  recommendations: string[];
}

type DocType = "bilancio" | "visura_cr" | "contratto" | "delibera" | "altro";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "bilancio", label: "Bilancio" },
  { value: "visura_cr", label: "Visura Centrale Rischi" },
  { value: "contratto", label: "Contratto" },
  { value: "delibera", label: "Delibera" },
  { value: "altro", label: "Altro" },
];

export default function DocumentSynthesis() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("altro");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setLoading(true);

      try {
        let text: string;

        if (selectedFile.type === "application/pdf") {
          // Per PDF, indichiamo che il supporto è limitato al testo embedded
          setError(
            "Estrazione testo PDF in corso... Nota: per file PDF complessi potrebbe essere necessaria un'estrazione OCR lato server."
          );
          // Tentiamo la lettura come testo — funziona per PDF con testo embedded
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const raw = e.target?.result as string;
              // Estrai testo leggibile dal PDF raw (rimuovi caratteri binari)
              const cleaned = raw.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
              if (cleaned.length < 50) {
                reject(new Error("Impossibile estrarre testo dal PDF. Il file potrebbe essere scansionato o protetto."));
              } else {
                resolve(cleaned);
              }
            };
            reader.onerror = () => reject(new Error("Errore nella lettura del file."));
            reader.readAsText(selectedFile);
          });
          setError(null);
        } else {
          // TXT e altri file di testo
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target?.result as string;
              resolve(content);
            };
            reader.onerror = () => reject(new Error("Errore nella lettura del file."));
            reader.readAsText(selectedFile);
          });
        }

        if (!text || text.trim().length === 0) {
          throw new Error("Il file non contiene testo estraibile.");
        }

        if (text.length > 50000) {
          text = text.slice(0, 50000);
        }

        const response = await fetch("/api/doc-synthesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, docType }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Errore nella sintesi del documento.");
        }

        setResult(data as SynthesisResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [docType]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="font-space flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white tracking-wide">
            Lettura Allegati — Sintesi AI
          </h2>
          <p className="text-xs text-slate-400">
            Analisi automatica documenti con METIS AI
          </p>
        </div>
      </div>

      {/* Doc Type Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400 whitespace-nowrap">
          Tipo documento:
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
        >
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="glass-panel relative cursor-pointer border-2 border-dashed border-slate-600/50 hover:border-cyan-500/50 rounded-xl p-8 text-center transition-all duration-300 hover:bg-cyan-500/5"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.csv,.xml"
          onChange={handleFileChange}
          className="hidden"
        />

        {!file && !loading && (
          <div className="flex flex-col items-center gap-3">
            <svg
              className="w-12 h-12 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-slate-400 text-sm">
              Carica un allegato per la sintesi automatica
            </p>
            <p className="text-slate-500 text-xs">
              PDF, TXT, CSV, XML — max 50.000 caratteri
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-cyan-400 text-sm font-medium">
              Elaborazione in corso...
            </p>
            {file && (
              <p className="text-slate-500 text-xs">{file.name}</p>
            )}
          </div>
        )}

        {file && !loading && (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-slate-300 text-sm">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="ml-2 text-slate-500 hover:text-red-400 transition-colors text-xs"
            >
              [rimuovi]
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="glass-panel border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Sintesi Esecutiva */}
          <div className="glass-panel border border-cyan-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Sintesi Esecutiva
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {result.summary}
            </p>
          </div>

          {/* Dati Chiave */}
          {result.keyData.length > 0 && (
            <div className="glass-panel border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                Dati Chiave
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.keyData.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-baseline gap-2 px-3 py-2 bg-slate-800/40 rounded-lg"
                  >
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm text-slate-200 font-medium text-right">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {result.redFlags.length > 0 && (
            <div className="glass-panel border border-red-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Red Flags
              </h3>
              <ul className="flex flex-col gap-2">
                {result.redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01"
                      />
                    </svg>
                    <span className="text-sm text-red-300">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raccomandazioni */}
          {result.recommendations.length > 0 && (
            <div className="glass-panel border border-green-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Raccomandazioni
              </h3>
              <ul className="flex flex-col gap-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-green-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No red flags message */}
          {result.redFlags.length === 0 && (
            <div className="glass-panel border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-green-300 text-sm">
                  Nessuna red flag rilevata nel documento.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
