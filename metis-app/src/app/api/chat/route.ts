import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── Portfolio data (mirrors home/page.tsx mock) ─────────────────────────────
const PRATICHE = [
  { id: 1,  name: "Alpha S.p.A.",     piva: "IT00000000001", status: "APPROVATA",      sector: "Manifatturiero", risk: "BASSO",   pd: 2.1, altman: 3.12, revenue: 15400000, operator: "M. Rossi"   },
  { id: 2,  name: "Beta Ltd.",        piva: "IT00000000002", status: "IN ANALISI",     sector: "Servizi",        risk: "MEDIO",   pd: 3.5, altman: 2.85, revenue: 8200000,  operator: "L. Bianchi" },
  { id: 3,  name: "Gamma SRL",        piva: "IT00000000003", status: "DA REVISIONARE", sector: "Tech",           risk: "BASSO",   pd: 1.8, altman: 3.45, revenue: 22100000, operator: "G. Verdi"   },
  { id: 4,  name: "Delta Corp.",      piva: "IT00000000004", status: "SOSPESA",        sector: "Edilizia",       risk: "ALTO",    pd: 5.2, altman: 1.95, revenue: 4500000,  operator: "A. Neri"    },
  { id: 5,  name: "Epsilon S.r.l.",   piva: "IT00000000005", status: "APPROVATA",      sector: "Alimentare",     risk: "BASSO",   pd: 0.9, altman: 4.10, revenue: 31000000, operator: "M. Rossi"   },
  { id: 6,  name: "Zeta Industries",  piva: "IT00000000006", status: "RIFIUTATA",      sector: "Manifatturiero", risk: "CRITICO", pd: 7.8, altman: 1.45, revenue: 2100000,  operator: "S. Russo"   },
  { id: 7,  name: "Eta Holding",      piva: "IT00000000007", status: "APPROVATA",      sector: "Servizi",        risk: "BASSO",   pd: 1.5, altman: 3.80, revenue: 45000000, operator: "L. Bianchi" },
  { id: 8,  name: "Theta Finance",    piva: "IT00000000008", status: "IN ANALISI",     sector: "Finanza",        risk: "MEDIO",   pd: 4.1, altman: 2.20, revenue: 12800000, operator: "G. Verdi"   },
  { id: 9,  name: "Iota Tech",        piva: "IT00000000009", status: "DA REVISIONARE", sector: "Tech",           risk: "MEDIO",   pd: 2.8, altman: 2.95, revenue: 9700000,  operator: "A. Neri"    },
  { id: 10, name: "Kappa Logistics",  piva: "IT00000000010", status: "SOSPESA",        sector: "Trasporti",      risk: "ALTO",    pd: 6.3, altman: 1.60, revenue: 6300000,  operator: "S. Russo"   },
  { id: 11, name: "Lambda Group",     piva: "IT00000000011", status: "APPROVATA",      sector: "Alimentare",     risk: "BASSO",   pd: 1.2, altman: 3.95, revenue: 28500000, operator: "M. Rossi"   },
  { id: 12, name: "Mu Pharma",        piva: "IT00000000012", status: "IN ANALISI",     sector: "Pharma",         risk: "MEDIO",   pd: 3.2, altman: 2.70, revenue: 18000000, operator: "L. Bianchi" },
  { id: 13, name: "Nu Energy",        piva: "IT00000000013", status: "RIFIUTATA",      sector: "Energia",        risk: "CRITICO", pd: 8.5, altman: 1.10, revenue: 3400000,  operator: "G. Verdi"   },
  { id: 14, name: "Xi Construction",  piva: "IT00000000014", status: "DA REVISIONARE", sector: "Edilizia",       risk: "ALTO",    pd: 4.8, altman: 2.05, revenue: 7600000,  operator: "A. Neri"    },
  { id: 15, name: "Omicron Digital",  piva: "IT00000000015", status: "APPROVATA",      sector: "Tech",           risk: "BASSO",   pd: 1.0, altman: 4.25, revenue: 52000000, operator: "S. Russo"   },
  { id: 16, name: "Pi Consulting",    piva: "IT00000000016", status: "IN ANALISI",     sector: "Servizi",        risk: "BASSO",   pd: 2.5, altman: 3.10, revenue: 5200000,  operator: "M. Rossi"   },
  { id: 17, name: "Rho Automotive",   piva: "IT00000000017", status: "SOSPESA",        sector: "Automotive",     risk: "ALTO",    pd: 5.9, altman: 1.75, revenue: 14200000, operator: "L. Bianchi" },
  { id: 18, name: "Sigma Textiles",   piva: "IT00000000018", status: "DA REVISIONARE", sector: "Manifatturiero", risk: "MEDIO",   pd: 3.8, altman: 2.50, revenue: 11000000, operator: "G. Verdi"   },
];

// ─── Tool implementations ─────────────────────────────────────────────────────
function cerca_pratiche({ status, rischio, settore, query }: {
  status?: string; rischio?: string; settore?: string; query?: string;
}) {
  let results = PRATICHE;
  if (status) results = results.filter(p => p.status.toLowerCase().includes(status.toLowerCase()));
  if (rischio) results = results.filter(p => p.risk.toLowerCase().includes(rischio.toLowerCase()));
  if (settore) results = results.filter(p => p.sector.toLowerCase().includes(settore.toLowerCase()));
  if (query) results = results.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.piva.includes(query) ||
    p.sector.toLowerCase().includes(query.toLowerCase())
  );
  return {
    count: results.length,
    pratiche: results.map(p => ({ id: p.id, name: p.name, status: p.status, risk: p.risk, pd: p.pd, altman: p.altman, sector: p.sector })),
  };
}

function get_pratica_dettaglio({ id, name }: { id?: number; name?: string }) {
  const p = id
    ? PRATICHE.find(p => p.id === id)
    : PRATICHE.find(p => p.name.toLowerCase().includes((name || "").toLowerCase()));
  if (!p) return { error: "Pratica non trovata" };
  return {
    id: p.id, name: p.name, piva: p.piva, status: p.status, risk: p.risk,
    pd: `${p.pd}%`, altman: p.altman, sector: p.sector,
    revenue: `€${(p.revenue / 1_000_000).toFixed(1)}M`, operator: p.operator,
    altman_status: p.altman > 2.9 ? "SAFE ZONE" : p.altman > 1.23 ? "GREY ZONE" : "DISTRESS ZONE",
    pd_status: p.pd < 3 ? "BASSO" : p.pd < 6 ? "MEDIO" : "ALTO",
  };
}

function get_portfolio_kpi() {
  const total = PRATICHE.length;
  const avgPD = (PRATICHE.reduce((s, p) => s + p.pd, 0) / total).toFixed(2);
  const avgAltman = (PRATICHE.reduce((s, p) => s + p.altman, 0) / total).toFixed(2);
  const totalRevenue = PRATICHE.reduce((s, p) => s + p.revenue, 0);
  const byStatus = PRATICHE.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const byRisk = PRATICHE.reduce((acc, p) => { acc[p.risk] = (acc[p.risk] || 0) + 1; return acc; }, {} as Record<string, number>);
  const highRisk = PRATICHE.filter(p => p.risk === "ALTO" || p.risk === "CRITICO").length;
  const overThreshold = PRATICHE.filter(p => p.pd > 5).length;
  return {
    total, avgPD, avgAltman, highRisk, overThreshold,
    totalRevenue: `€${(totalRevenue / 1_000_000).toFixed(0)}M`,
    byStatus, byRisk,
  };
}

function naviga_a({ page, id }: { page: string; id?: number }) {
  const routes: Record<string, string> = {
    home: "/home", dashboard: "/home", copilot: "/copilot",
    pratica: "/pratica", dossier: "/dossier", portafoglio: "/portafoglio",
    "rule-engine": "/rule-engine", impostazioni: "/settings",
  };
  const base = routes[page.toLowerCase()] || `/${page}`;
  const url = id ? `${base}?id=${id}` : base;
  return { action: "navigate", url, page, id };
}

// ─── Tool dispatch ────────────────────────────────────────────────────────────
function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "cerca_pratiche":        return cerca_pratiche(args as Parameters<typeof cerca_pratiche>[0]);
    case "get_pratica_dettaglio": return get_pratica_dettaglio(args as Parameters<typeof get_pratica_dettaglio>[0]);
    case "get_portfolio_kpi":     return get_portfolio_kpi();
    case "naviga_a":              return naviga_a(args as Parameters<typeof naviga_a>[0]);
    default: return { error: "Tool non trovato" };
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sei METIS, l'assistente AI agentizzato della piattaforma Metis — sistema di credit underwriting Glass-Box sviluppato da FINOMNIA per banche e istituti finanziari italiani.

Sei un analista del credito super-intelligente (Underwriter Copilot) con accesso diretto ai dati in tempo reale del portafoglio tramite i tuoi tool. Rispondi SEMPRE in italiano, in modo professionale e tecnico, usando markdown (bold, bullet). 

**TOOL DISPONIBILI**: usa i tool ogni volta che l'utente chiede dati su pratiche, portafoglio, statistiche. Non inventare dati che puoi recuperare con i tool.

**MODELLI DI RISCHIO INTEGRATI**:
- Altman Z-Score: >2.9 Safe, 1.23-2.9 Grey Zone, <1.23 Distress
- PD (Probabilità Default): <3% Basso, 3-6% Medio, >6% Alto
- DSCR Forecast: soglia critica <1.1x
- Moduli Analisi: M1 PEF, M2 NLP Sentiment, M3 KPI, M4 Benchmark ISTAT, M5 Centrale Rischi, M6 Cross-check, M7 DSCR, M8 SWOT
- Conformità: EU AI Act, CCII D.Lgs.14/2019, EBA/GL/2020/06 ESG

Quando proponi di aprire una pratica o un dossier, usa il tool naviga_a — il frontend mostrerà automaticamente una card interattiva cliccabile.`;

// ─── Tool declarations for Gemini ────────────────────────────────────────────
const tools = [{
  functionDeclarations: [
    {
      name: "cerca_pratiche",
      description: "Cerca pratiche nel portafoglio. Usa quando l'utente chiede di trovare pratiche per status, rischio, settore o nome.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          status:  { type: SchemaType.STRING, description: "Stato: APPROVATA, IN ANALISI, DA REVISIONARE, SOSPESA, RIFIUTATA" },
          rischio: { type: SchemaType.STRING, description: "Livello rischio: BASSO, MEDIO, ALTO, CRITICO" },
          settore: { type: SchemaType.STRING, description: "Settore industriale es. Tech, Edilizia, Manifatturiero" },
          query:   { type: SchemaType.STRING, description: "Ricerca testuale libera su nome azienda o PIVA" },
        },
      },
    },
    {
      name: "get_pratica_dettaglio",
      description: "Recupera i dettagli completi di una pratica specifica. Usa quando l'utente chiede info su un'azienda specifica.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          id:   { type: SchemaType.NUMBER, description: "ID numerico della pratica" },
          name: { type: SchemaType.STRING, description: "Nome dell'azienda (anche parziale)" },
        },
      },
    },
    {
      name: "get_portfolio_kpi",
      description: "Restituisce le KPI aggregate del portafoglio: PD media, Altman medio, distribuzione stati/rischio, fatturato totale. Usa per domande generali sul portafoglio.",
      parameters: { type: SchemaType.OBJECT, properties: {} },
    },
    {
      name: "naviga_a",
      description: "Naviga a una pagina dell'applicazione. Usa quando l'utente vuole aprire una pratica, un dossier o una sezione specifica. Il frontend mostrerà una card cliccabile.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          page: { type: SchemaType.STRING, description: "Nome pagina: home, pratica, dossier, copilot, portafoglio, rule-engine" },
          id:   { type: SchemaType.NUMBER, description: "ID pratica/dossier (se applicabile)" },
        },
        required: ["page"],
      },
    },
  ],
}];

// ─── Chat message types ───────────────────────────────────────────────────────
interface ChatMessage { role: "user" | "model" | "assistant"; content: string; }

function toGeminiRole(role: ChatMessage["role"]): "user" | "model" {
  return role === "user" ? "user" : "model";
}

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (m) =>
      m !== null && typeof m === "object" &&
      "role" in m && (m.role === "user" || m.role === "model" || m.role === "assistant") &&
      "content" in m && typeof m.content === "string" && m.content.trim().length > 0
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ reply: "Configurazione mancante: GEMINI_API_KEY non impostata." }, { status: 503 });
  }

  const apiSecret = process.env.METIS_API_SECRET;
  if (apiSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${apiSecret}`) {
      return NextResponse.json({ reply: "Non autorizzato." }, { status: 401 });
    }
  }

  try {
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ reply: "Richiesta non valida: body non è JSON." }, { status: 400 }); }

    const messages = (body as Record<string, unknown>)?.messages;
    if (!isValidMessages(messages)) {
      return NextResponse.json(
        { reply: "Richiesta non valida: `messages` deve essere un array non vuoto di {role, content}." },
        { status: 400 }
      );
    }

    // Build context-aware system prompt
    const dossierCtx = (body as Record<string, unknown>)?.dossierContext as Record<string, string | number> | null | undefined;
    const dossierBlock = dossierCtx
      ? `\n\n---\n## DOSSIER ATTIVO\nSta analizzando l'azienda **${dossierCtx.companyName}** (settore: ${dossierCtx.sector ?? 'N/A'}).\n- Altman Z-Score: ${dossierCtx.altmanZ ?? 'N/A'}\n- PD (Prob. Default): ${dossierCtx.pd ?? 'N/A'}\n- DSCR Prospettico: ${dossierCtx.dscr ?? 'N/A'}\n- Giudizio Sintetico: **${dossierCtx.riskLabel ?? 'N/A'}**\n\nQuando rispondi, fai SEMPRE riferimento a questi dati specifici invece di dati generici. Usa il nome dell'azienda. Fornisci analisi contestualizzate al suo profilo di rischio.\n---`
      : "";
    const effectiveSystemPrompt = SYSTEM_PROMPT + dossierBlock;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // @ts-expect-error — tools type accepted at runtime
      tools,
    });

    const history = messages.slice(0, -1).map((msg) => ({
      role: toGeminiRole(msg.role),
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Inizializza. Chi sei e cosa puoi fare?" }] },
        { role: "model", parts: [{ text: effectiveSystemPrompt + "\n\nSono METIS, il motore agentico predittivo e analitico della piattaforma. Posso cercare pratiche, analizzare rischi, recuperare KPI di portafoglio e navigare nella piattaforma. Dimmi come posso aiutarti." }] },
        ...history,
      ],
    });

    const lastMessage = messages[messages.length - 1];

    // Agentic loop: handle function calls iteratively
    let response = await chat.sendMessage(lastMessage.content);
    const actions: Array<{ action: string; url: string; label: string; id?: number }> = [];

    // Max 5 agentic steps to prevent infinite loops
    for (let step = 0; step < 5; step++) {
      const candidate = response.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const fnCalls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);
      if (fnCalls.length === 0) break;

      // Execute all function calls in this turn
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fnResults = (fnCalls as any[]).map((p: { functionCall: { name: string; args: Record<string, unknown> } }) => {
        const result = executeTool(p.functionCall.name, p.functionCall.args || {});

        // Collect navigation actions for the frontend
        if (p.functionCall.name === "naviga_a" && "action" in result) {
          const pratica = PRATICHE.find(pr => pr.id === (result as { id?: number }).id);
          actions.push({
            action: (result as { action: string }).action,
            url: (result as { url: string }).url,
            label: pratica ? pratica.name : (result as { page: string }).page,
            id: (result as { id?: number }).id,
          });
        }

        return {
          functionResponse: {
            name: p.functionCall.name,
            response: result,
          },
        };
      });

      // Send tool results back to model
      response = await chat.sendMessage(fnResults as never);
    }

    const text = response.response.text();
    return NextResponse.json({ reply: text, actions: actions.length > 0 ? actions : undefined });

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Gemini API error:", error.message);
    return NextResponse.json({ reply: "Mi dispiace, c'è stato un errore tecnico. Riprova tra un momento." }, { status: 500 });
  }
}
