// ─── Centralized ID Generator ─────────────────────────────────────────────────
// Thread-safe per-call ID factory: ogni chiamata a createIdGenerator()
// restituisce un generatore isolato con contatore interno a zero.
// Evita collisioni tra chiamate parallele a runCCIICheck / runEBACheck.

export function createIdGenerator(prefix: string, padLen = 3): () => string {
  let counter = 0;
  return () => `${prefix}-${(++counter).toString().padStart(padLen, '0')}`;
}
