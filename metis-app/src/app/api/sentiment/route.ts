import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY non impostata" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const companyName: string = body?.companyName || "Azienda Srl";
    const piva: string = body?.piva || "";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Sei METIS, un sistema di credit underwriting italiano. Genera un'analisi di web sentiment per la seguente azienda: "${companyName}"${piva ? ` (P.IVA: ${piva})` : ""}.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido con questa struttura esatta (nessun testo extra, nessun markdown, solo il JSON grezzo):

{
  "score": <numero intero da 0 a 100>,
  "label": "<una delle seguenti: POSITIVO | NEUTRO | MISTO | ALLERTA NEGATIVA>",
  "summary": "<2-3 frasi in italiano che riassumono la reputazione web dell'azienda, i segnali chiave, e il sentiment complessivo. Tono professionale, credit-oriented.>",
  "sources": [
    {
      "title": "<titolo realistico di articolo o fonte web>",
      "url": "<URL plausibile ma fittizio, esempio: https://www.ilsole24ore.com/...>",
      "snippet": "<estratto breve di 1-2 frasi coerente con il titolo>"
    }
  ]
}

Regole:
- Genera esattamente 3 fonti nella lista "sources"
- Il sentiment deve essere coerente con ciò che si conosce genericamente del settore dell'azienda
- Se il nome dell'azienda suggerisce un settore (es. "Tech", "Finance", "Construction"), usalo come contesto
- I valori numerici devono essere realistici (range tipico 35-85)
- Non includere mai dati personali reali o informazioni verificabili sensibili
- Rispondi SOLO con il JSON, zero testo aggiuntivo`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip markdown code blocks if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Gemini sentiment JSON parse error:", cleaned.slice(0, 200));
      return NextResponse.json({
        score: 50,
        label: "NEUTRO",
        summary: "Analisi sentiment in elaborazione. Dati insufficienti per una valutazione definitiva.",
        sources: [],
      });
    }

    // Validate and sanitize
    parsed.score = Math.min(100, Math.max(0, Number(parsed.score) || 50));
    if (!["POSITIVO", "NEUTRO", "MISTO", "ALLERTA NEGATIVA"].includes(parsed.label)) {
      parsed.label = "NEUTRO";
    }
    if (!Array.isArray(parsed.sources)) parsed.sources = [];
    parsed.sources = parsed.sources.slice(0, 5); // max 5 sources

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Sentiment API error:", msg);
    return NextResponse.json({
      score: 50,
      label: "NEUTRO",
      summary: "Servizio temporaneamente non disponibile. Riprova tra un momento.",
      sources: [],
    }, { status: 500 });
  }
}
