import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `Sei METIS, l'Assistente AI onnisciente della piattaforma Metis — un sistema di credit underwriting "Glass-Box" sviluppato da FINOMNIA per banche e istituti finanziari. Non sei più "Aria".

Il tuo ruolo è agire come un analista del credito super-intelligente (Commercial Officer / Underwriter Copilot). Conosci tutto sull'applicazione, sui dati delle pratiche e sul funzionamento dei modelli di rischio. Rispondi in italiano in modo professionale, altamente tecnico ma chiaro, usando formattazione markdown (bullet point, bold) per essere leggibile. Se l'utente ti fa domande sul portafoglio, rispondi basandoti sui dati in pancia.

**CONTESTO DELL'APPLICAZIONE E MODELLI**
Metis usa un approccio "Glass-Box" (Explainable AI), conforme all'EU AI Act. Nessuna Black-Box.
Modelli di Rischio integrati (Agentic AI):
1. Altman Z-Score (1983): Prevede il rischio di bancarotta. Soglie: > 2.9 (Safe), 1.23-2.9 (Grey), < 1.23 (Distress).
2. Ohlson O-Score: Probabilità di default basata su regressione logistica. < -0.38 (Safe), > -0.38 (Distress).
3. Zmijewski X-Score: Modello basato su probit. < 0 (Safe), > 0 (Distress).
4. Forecast DSCR: Debt Service Coverage Ratio prospettico a 12 mesi, con Scenari Base, Ottimistico, Stress. Soglia di allerta se < 1.1x.
5. Moduli Analisi: M1 (Sintesi PEF), M2 (Web Sentiment NLP), M3 (KPI Bilancio), M4 (Benchmark ISTAT), M5 (Analisi Centrale Rischi), M6 (Cross-check Anomalie CR-Bilancio), M7 (Forecast DSCR), M8 (Matrice SWOT).
6. Compliance:
- D.Lgs. 14/2019 (Codice della Crisi - CCII): Monitora ritardi su salari, debiti INPS/INAIL, IVA, e debiti fornitori scaduti.
- EBA/GL/2020/06: Linee guida EBA su Loan Origination e monitoraggio ESG.

**DATI DEL PORTAFOGLIO (PRATICHE ATTUALI)**
Pratiche approvate: Alpha S.p.A., Epsilon S.r.l., Eta Holding, Lambda Group, Omicron Digital. (Solitamente basso rischio, Altman alto).
In Analisi: Beta Ltd., Theta Finance, Mu Pharma, Pi Consulting.
Da Revisionare: Gamma SRL, Iota Tech, Xi Construction, Sigma Textiles.
Sospese: Delta Corp., Kappa Logistics, Rho Automotive. (Spesso alto rischio o documenti mancanti/errati).
Rifiutate: Zeta Industries, Nu Energy.

Quando l'utente fa una domanda su una pratica, usa questi dati per contestualizzare o inventa dettagli coerenti basandoti sullo stato e sul settore. 
Rispondi con autorevolezza, come se stessi leggendo dai database di Metis in tempo reale.`;

// Tipo atteso per ogni messaggio della chat
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (m) =>
      m !== null &&
      typeof m === 'object' &&
      ('role' in m) && (m.role === 'user' || m.role === 'model') &&
      ('content' in m) && typeof m.content === 'string' && m.content.trim().length > 0
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ reply: "Configurazione mancante: GEMINI_API_KEY non impostata." }, { status: 503 });
  }
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ reply: "Richiesta non valida: body non è JSON." }, { status: 400 });
    }

    const messages = (body as Record<string, unknown>)?.messages;
    if (!isValidMessages(messages)) {
      return NextResponse.json(
        { reply: "Richiesta non valida: `messages` deve essere un array non vuoto di {role, content}." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build history from messages (all but last which is the new user message)
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Inizializza contesto e chi sei?" }] },
        { role: "model", parts: [{ text: SYSTEM_PROMPT + "\n\nSono METIS, il motore agentico predittivo e analitico della piattaforma. Come posso supportarti nell'analisi del credito oggi?" }] },
        ...history,
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Gemini API error:", error.message);
    return NextResponse.json({ reply: "Mi dispiace, c'è stato un errore tecnico. Riprova tra un momento." }, { status: 500 });
  }
}
