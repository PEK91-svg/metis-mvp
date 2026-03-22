import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const DOC_TYPES = ["bilancio", "visura_cr", "contratto", "delibera", "altro"] as const;
type DocType = (typeof DOC_TYPES)[number];

function isValidDocType(value: unknown): value is DocType {
  return typeof value === "string" && DOC_TYPES.includes(value as DocType);
}

const SYSTEM_PROMPT = `Sei METIS Document Analyzer, il modulo di sintesi documentale della piattaforma Metis — un sistema di credit underwriting "Glass-Box" sviluppato da FINOMNIA.

Il tuo compito è analizzare il testo estratto da documenti finanziari e produrre una sintesi strutturata in formato JSON.

Devi restituire ESCLUSIVAMENTE un oggetto JSON valido (senza markdown, senza backtick, senza commenti) con questa struttura esatta:
{
  "summary": "Sintesi esecutiva del documento in 3-5 righe",
  "keyData": [
    {"label": "Nome campo", "value": "Valore estratto"},
    ...
  ],
  "redFlags": [
    "Descrizione anomalia o red flag rilevata",
    ...
  ],
  "recommendations": [
    "Raccomandazione operativa",
    ...
  ]
}

Regole:
- "summary" deve essere una sintesi esecutiva concisa di 3-5 righe che cattura i punti essenziali del documento.
- "keyData" deve contenere i dati chiave estratti dal documento (es. fatturato, utile netto, indici finanziari, denominazione società, codice fiscale, importi, date rilevanti, ecc.). Minimo 3 elementi, massimo 15.
- "redFlags" deve elencare anomalie, incongruenze, segnali di rischio, dati mancanti o preoccupanti. Se non ce ne sono, usa un array vuoto [].
- "recommendations" deve contenere suggerimenti operativi per l'analista del credito. Minimo 1 elemento.
- Rispondi SOLO con il JSON, nessun altro testo.`;

function getDocTypeInstruction(docType: DocType): string {
  switch (docType) {
    case "bilancio":
      return "Il documento è un BILANCIO D'ESERCIZIO. Concentrati su: fatturato, utile/perdita netto, EBITDA, patrimonio netto, posizione finanziaria netta, indici di liquidità e solidità, trend rispetto ad anni precedenti se disponibili.";
    case "visura_cr":
      return "Il documento è una VISURA CENTRALE RISCHI (Banca d'Italia). Concentrati su: esposizioni totali (accordato vs utilizzato), sconfini, sofferenze, inadempienze probabili, garanzie rilasciate, numero di intermediari segnalanti, andamento temporale delle esposizioni.";
    case "contratto":
      return "Il documento è un CONTRATTO. Concentrati su: parti coinvolte, oggetto del contratto, importi e condizioni economiche, durata, clausole risolutive, garanzie, penali, condizioni sospensive.";
    case "delibera":
      return "Il documento è una DELIBERA (di fido, CdA, assemblea). Concentrati su: organo deliberante, oggetto della delibera, importi deliberati, condizioni e covenant, garanzie richieste, scadenze, eventuali voti contrari o riserve.";
    case "altro":
      return "Il documento è di tipo generico. Estrai tutti i dati rilevanti per un'analisi creditizia: importi, date, soggetti coinvolti, obbligazioni, rischi identificabili.";
  }
}

interface SynthesisResult {
  summary: string;
  keyData: { label: string; value: string }[];
  redFlags: string[];
  recommendations: string[];
}

function isValidSynthesisResult(value: unknown): value is SynthesisResult {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.summary !== "string") return false;
  if (!Array.isArray(obj.keyData)) return false;
  if (!obj.keyData.every((item: unknown) => {
    if (item === null || typeof item !== "object") return false;
    const kv = item as Record<string, unknown>;
    return typeof kv.label === "string" && typeof kv.value === "string";
  })) return false;
  if (!Array.isArray(obj.redFlags) || !obj.redFlags.every((f: unknown) => typeof f === "string")) return false;
  if (!Array.isArray(obj.recommendations) || !obj.recommendations.every((r: unknown) => typeof r === "string")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Configurazione mancante: GEMINI_API_KEY non impostata." },
      { status: 503 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Richiesta non valida: body non è JSON." },
        { status: 400 }
      );
    }

    const { text, docType } = body as Record<string, unknown>;

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Richiesta non valida: `text` deve essere una stringa non vuota." },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Richiesta non valida: `text` supera il limite di 50000 caratteri." },
        { status: 400 }
      );
    }

    if (!isValidDocType(docType)) {
      return NextResponse.json(
        { error: `Richiesta non valida: \`docType\` deve essere uno tra: ${DOC_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const docInstruction = getDocTypeInstruction(docType);

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Qual è il tuo ruolo e come devi rispondere?" }],
        },
        {
          role: "model",
          parts: [{ text: SYSTEM_PROMPT }],
        },
      ],
    });

    const userPrompt = `${docInstruction}

Analizza il seguente testo estratto dal documento e produci la sintesi strutturata in JSON:

---INIZIO DOCUMENTO---
${text.trim()}
---FINE DOCUMENTO---`;

    const result = await chat.sendMessage(userPrompt);
    const responseText = result.response.text().trim();

    // Parse JSON dalla risposta, gestendo eventuali backtick markdown
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      return NextResponse.json(
        { error: "Errore nell'elaborazione: la risposta del modello non è in formato valido. Riprova." },
        { status: 502 }
      );
    }

    if (!isValidSynthesisResult(parsed)) {
      console.error("Invalid synthesis result structure:", parsed);
      return NextResponse.json(
        { error: "Errore nell'elaborazione: struttura della risposta non valida. Riprova." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Doc synthesis API error:", error.message);
    return NextResponse.json(
      { error: "Errore tecnico durante l'elaborazione del documento. Riprova tra un momento." },
      { status: 500 }
    );
  }
}
