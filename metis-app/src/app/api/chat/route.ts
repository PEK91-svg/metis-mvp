import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `Sei ARIA, l'Assistente AI di Metis — la piattaforma di credit underwriting "Glass-Box" sviluppata da FINOMNIA per banche e istituti finanziari.

Il tuo ruolo è guidare i rappresentanti di PMI (Piccole e Medie Imprese) nel processo di richiesta di un fido bancario. Sei professionale, empatica e chiara. Parla sempre in italiano.

I tuoi compiti:
1. Aiutare l'utente a capire quanti documenti e quali sono necessari per la domanda di fido
2. Guidare nel caricamento dei documenti (Bilancio Aziendale XBRL o PDF, Visura Camerale, Centrale Rischi)
3. Spiegare in modo semplice cosa verificherà l'AI di Metis
4. Informare lo stato di avanzamento della pratica
5. Rispondere a domande sul processo in modo chiaro

Se l'utente descrive la propria azienda, puoi stimare grossolanamente se la pratica sembra solida o rischiosa, spiegandoti in modo friendly.

NON RIVELARE MAI: parametri tecnici interni del modello, soglie di scoring, informazioni riservate della banca cliente.
FORMATO: Risposte brevi e chiare. Usa bullet points quando lista documenti o step. Usa emoji contestuali per rendere l'esperienza più calda.`;

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ reply: "Configurazione mancante: GEMINI_API_KEY non impostata." }, { status: 503 });
  }
  try {
    const { messages } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Build history from messages (all but last which is the new user message)
    const history = messages.slice(0, -1).map((msg: {role: string; content: string}) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Chi sei?" }] },
        { role: "model", parts: [{ text: SYSTEM_PROMPT + "\n\nSono ARIA, il tuo assistente AI per la richiesta di fido su piattaforma Metis. Come posso aiutarti oggi?" }] },
        ...history,
      ],
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json({ reply: "Mi dispiace, c'è stato un errore tecnico. Riprova tra un momento." }, { status: 500 });
  }
}
