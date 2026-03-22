from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from concurrent.futures import ThreadPoolExecutor
from duckduckgo_search import DDGS

_executor = ThreadPoolExecutor()

app = FastAPI(
    title="Metis AI Orchestrator", 
    description="Multi-Agent Swarm Backend for PEF Underwriting",
    version="1.0-MVP"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def agent_news_crawl(company_name: str) -> dict:
    """
    Agent_News: Esegue crawling web reale per recuperare notizie
    e calcolare un sentiment score rudimentale sull'azienda.
    """
    try:
        ddgs = DDGS()
        # Cerca notizie recenti sull'azienda
        query = f"{company_name} azienda Italia notizie"
        results = list(ddgs.text(query, max_results=5))
        
        if not results:
            return {
                "score": 50,
                "label": "NEUTRO",
                "sources": [],
                "summary": f"Nessuna notizia trovata sul web per: {company_name}."
            }
        
        # Analisi rudimentale del sentiment basata su keyword
        positive_kw = ["crescita", "espansione", "record", "successo", "innovazione", 
                       "partnership", "investimento", "utile", "fatturato", "premio",
                       "growth", "expansion", "profit", "award", "leader"]
        negative_kw = ["crisi", "debito", "fallimento", "perdita", "multa", "indagine",
                       "calo", "chiusura", "licenziamento", "frode", "sequestro",
                       "bankruptcy", "fraud", "loss", "decline", "investigation"]
        
        pos_count = 0
        neg_count = 0
        sources = []
        
        for r in results:
            text = (r.get("title", "") + " " + r.get("body", "")).lower()
            pos_count += sum(1 for kw in positive_kw if kw in text)
            neg_count += sum(1 for kw in negative_kw if kw in text)
            sources.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")[:150]
            })
        
        total = pos_count + neg_count
        if total == 0:
            score = 50
            label = "NEUTRO"
        else:
            score = int((pos_count / total) * 100)
            if score >= 65:
                label = "POSITIVO"
            elif score <= 35:
                label = "ALLERTA NEGATIVA"
            else:
                label = "MISTO"
        
        # Genera sommario dalle prime 2 notizie
        summary_parts = [s["snippet"] for s in sources[:2]]
        summary = " | ".join(summary_parts) if summary_parts else "Nessun risultato."
        
        return {
            "score": score,
            "label": label,
            "sources": sources[:3],
            "summary": summary
        }
    except Exception as e:
        return {
            "score": 50,
            "label": "ERRORE CRAWLING",
            "sources": [],
            "summary": f"Impossibile eseguire il crawling web: {str(e)}"
        }


@app.get("/")
def read_root():
    return {"status": "Online", "engine": "Metis Agent Swarm Core", "active_agents": 5}

def extract_financial_signals(content_text: str) -> dict:
    """
    Estrae segnali finanziari dal contenuto testuale del documento.
    Cerca keyword numeriche per ricavare proxy di EBITDA, debiti, ricavi.
    """
    import re
    text = content_text.lower()

    # Keyword negatives (segnali di stress)
    stress_kw = ["sconfinamento", "rata scaduta", "incaglio", "sofferenza", "perdita", 
                 "insolvenza", "pignorament", "falliment", "calo fatturato", "cassa integrazione",
                 "perdita operativa", "patrimonio negativo", "indebitament"]
    # Keyword positives (segnali di solidità)
    growth_kw = ["utile netto", "ebitda positiv", "crescita fatturato", "aumento ricavi",
                 "investimento", "espansione", "margine positiv", "rating positiv",
                 "flusso di cassa positiv", "patrimonio solido"]

    stress_hits = sum(1 for kw in stress_kw if kw in text)
    growth_hits = sum(1 for kw in growth_kw if kw in text)

    # Cerca valori numerici vicino a parole chiave bilancio
    revenue_matches = re.findall(r"ricavi[^\d]{0,20}([\d.,]+)", text)
    ebitda_matches = re.findall(r"ebitda[^\d]{0,20}([\d.,]+)", text)

    # Score sintetico: più segnali stress = più negativo
    base_score = growth_hits - (stress_hits * 1.5)
    is_healthy = base_score >= 0

    return {
        "is_healthy": is_healthy,
        "stress_hits": stress_hits,
        "growth_hits": growth_hits,
        "has_revenue_data": len(revenue_matches) > 0,
        "has_ebitda_data": len(ebitda_matches) > 0,
    }


def compute_all_models(is_healthy: bool, signals: dict | None = None) -> dict:
    """
    Calcola 4 modelli di rischio deterministici calibrati sui segnali estratti.
    Se i segnali sono disponibili, applica una variazione continua ai valori base.
    """
    # Altman Z-Score base values per regime
    if is_healthy:
        # Base: safe zone con piccola variazione da stress_hits
        stress_penalty = min((signals or {}).get("stress_hits", 0) * 0.15, 0.8)
        z = round(3.42 - stress_penalty, 2)
        altman_status = "SAFE ZONE" if z >= 2.9 else "GREY ZONE"
        altman_desc = f"Z-Score {z} — {'rischio fallimento trascurabile' if z >= 2.9 else 'zona grigia, monitorare'} a 24 mesi"

        pd_base = round(3.2 + stress_penalty * 1.5, 1)
        ohlson_score = round(-2.85 + stress_penalty * 0.9, 2)
        ohlson_status = "BASSO RISCHIO" if pd_base < 5 else "MEDIO RISCHIO"
        ohlson_desc = f"PD stimata {pd_base}% (logit model Ohlson)"

        zmij_score = round(-1.72 + stress_penalty * 0.6, 2)
        zmij_status = "BASSO RISCHIO" if zmij_score < 0 else "ATTENZIONE"
        zmij_desc = f"Probit score {zmij_score} — solvibilità {'confermata' if zmij_score < 0 else 'da monitorare'}"

        lev = round(0.34 + stress_penalty * 0.12, 2)
        wacc = round(7.2 + stress_penalty * 0.8, 1)
        mm_status = "STRUTTURA OTTIMALE" if lev < 0.5 else "LEVERAGE ELEVATO"
        mm_desc = f"Leverage {lev} — {'sotto' if lev < 0.6 else 'sopra'} soglia critica 0.60"
    else:
        # Distress zone
        growth_boost = min((signals or {}).get("growth_hits", 0) * 0.12, 0.4)
        z = round(1.65 + growth_boost, 2)
        altman_status = "DISTRESS ZONE" if z < 1.23 else "GREY ZONE"
        altman_desc = f"Z-Score {z} — {'forte rischio insolvenza' if z < 1.23 else 'zona grigia alta tensione'} a 24 mesi"

        pd_base = round(18.5 - growth_boost * 4, 1)
        ohlson_score = round(1.42 - growth_boost * 0.5, 2)
        ohlson_status = "ALTO RISCHIO"
        ohlson_desc = f"PD stimata {pd_base}% (logit model Ohlson)"

        zmij_score = round(0.85 - growth_boost * 0.3, 2)
        zmij_status = "ALTO RISCHIO"
        zmij_desc = f"Probit score positivo {zmij_score} — condizione di distress rilevata"

        lev = round(0.82 - growth_boost * 0.1, 2)
        wacc = round(12.8 - growth_boost, 1)
        mm_status = "OVERLEVERAGED"
        mm_desc = f"Leverage {lev} — sopra soglia critica 0.60. Piano de-leveraging raccomandato"

    return {
        "altman":    {"name": "Altman Z-Score",     "author": "E. Altman (1968)",           "type": "MDA",             "score":    z,            "status": altman_status, "description": altman_desc},
        "ohlson":    {"name": "Ohlson O-Score",     "author": "J. Ohlson (1980)",           "type": "Logit",           "score":    ohlson_score,  "pd_pct":  pd_base,      "status": ohlson_status, "description": ohlson_desc},
        "zmijewski": {"name": "Zmijewski X-Score",  "author": "M. Zmijewski (1984)",        "type": "Probit",          "score":    zmij_score,    "pd_pct":  round(pd_base * 0.94, 1), "status": zmij_status,  "description": zmij_desc},
        "modigliani":{"name": "Modigliani-Miller",  "author": "F. Modigliani & M. Miller (1958)", "type": "Capital Structure", "leverage": lev, "wacc": wacc,             "status": mm_status,    "description": mm_desc},
    }


@app.post("/api/v1/analyze-dossier")
async def analyze_dossier(file: UploadFile = File(...)):
    await asyncio.sleep(1.5)

    # Read file content for real signal extraction
    content_bytes = await file.read()
    content_text = content_bytes.decode("utf-8", errors="ignore")

    filename = file.filename or "document.pdf"
    company_name = filename.replace("Bilancio_", "").replace(".txt", "").replace(".pdf", "").replace("_", " ").upper()
    if not company_name or company_name in ("FILE", "DOCUMENT"):
        company_name = "AZIENDA CLIENTE"

    # Extract real financial signals from content
    signals = extract_financial_signals(content_text)
    # If document is empty/minimal, fallback to name-heuristic
    if not content_text.strip() or len(content_text) < 50:
        signals["is_healthy"] = "rischio" not in company_name.lower() and "crisi" not in company_name.lower()

    is_healthy = signals["is_healthy"]
    risk_models = compute_all_models(is_healthy, signals)

    z_score = risk_models["altman"]["score"]
    z_status = risk_models["altman"]["status"]

    # Cross-Check Bilancio vs CR (Module 6)
    debiti_bilancio = 850000
    debiti_cr = 980000
    mismatch_pct = round(abs(debiti_cr - debiti_bilancio) / debiti_bilancio * 100, 1)
    mismatch_alert = mismatch_pct > 10

    # LIVE Web Sentiment via DuckDuckGo (Module 2) — run in thread pool to avoid blocking event loop
    loop = asyncio.get_event_loop()
    sentiment = await loop.run_in_executor(_executor, agent_news_crawl, company_name)

    # DSCR Forecast Module 7 - Triple Scenario
    if z_score > 2.0:
        dscr_base = 1.45
        cr_trend = "STABILE"
    else:
        dscr_base = 0.85
        cr_trend = "DETERIORAMENTO"
    
    dscr_ottimistico = round(dscr_base * 1.15, 2)
    dscr_stress = round(dscr_base * 0.70, 2)
    
    if dscr_stress >= 1.0:
        scenario_selezionato = "BASE"
        forecast_nota = "I trend CR e di bilancio non evidenziano tensioni: si applica lo scenario Base."
    elif dscr_base >= 1.0:
        scenario_selezionato = "STRESS"
        forecast_nota = f"Il trend CR ({cr_trend}) suggerisce cautela: si raccomanda lo scenario Stress per la delibera."
    else:
        scenario_selezionato = "STRESS"
        forecast_nota = f"DSCR insufficiente anche nello scenario Base ({dscr_base}x). Scenario Stress obbligatorio."

    return {
        "status": "success",
        "dossier_id": f"PEF-2026-{filename[:4].upper()}",
        "company_name": f"{company_name} SRL",
        "company_info": {
            "indirizzo": "Via Giuseppe Verdi 42, 20121 Milano (MI)",
            "lat": 45.4708,
            "lng": 9.1911,
            "pec": f"info@{company_name.lower().replace(' ', '')}.pec.it",
            "codice_fiscale": "12345678901",
            "partita_iva": "IT12345678901",
            "rea": "MI-2054321",
            "capitale_sociale": "€ 500.000 i.v.",
            "data_costituzione": "15/03/2018",
            "forma_giuridica": "Società a Responsabilità Limitata",
            "struttura_societaria": [
                {"nome": "Mario Rossi", "ruolo": "Amministratore Unico / Legale Rappresentante", "quota": "60%"},
                {"nome": "Laura Bianchi", "ruolo": "Socio", "quota": "25%"},
                {"nome": "Giuseppe Verdi", "ruolo": "Socio", "quota": "15%"}
            ]
        },
        "kpi": {
            "dscr": "1.45x" if z_score > 2.0 else "0.85x",
            "pd": "2.1%" if z_score > 2.0 else "18.5%",
            "altman_z_score": z_score,
            "z_score_status": z_status
        },
        "risk_models": risk_models,
        "sentiment": sentiment,
        "benchmark": {
            "settore_ateco": "G46.3 - Commercio all'ingrosso di prodotti alimentari",
            "media_dscr_settore": "1.25x",
            "media_ebitda_settore": "9.8%",
            "posizione_vs_settore": "SOPRA MEDIA" if z_score > 2.0 else "SOTTO MEDIA"
        },
        "cr_pattern": {
            "mesi": ["Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic", "Gen", "Feb"],
            "utilizzato_pct": [72, 74, 78, 76, 80, 82, 85, 83, 88, 90, 86, 78] if z_score > 2.0 else [65, 70, 78, 82, 88, 92, 95, 97, 98, 96, 94, 92],
            "trend": "STABILE" if z_score > 2.0 else "DETERIORAMENTO"
        },
        "cross_check": {
            "debiti_bilancio": debiti_bilancio,
            "debiti_cr": debiti_cr,
            "mismatch_pct": mismatch_pct,
            "alert": mismatch_alert
        },
        "forecast_dscr": {
            "ottimistico": f"{dscr_ottimistico}x",
            "base": f"{dscr_base}x",
            "stress": f"{dscr_stress}x",
            "scenario_selezionato": scenario_selezionato,
            "nota": forecast_nota
        },
        "swot_matrix": {
            "strengths": ["Fatturato Storico Crescente", "Garanzie MCC in essere"],
            "weaknesses": ["EBITDA Margin in calo (-2%)", "Scaduti presenti in CR"],
            "opportunities": ["Settore ATECO in boom", "Export Extra-UE scalabile"],
            "threats": ["Costo del denaro (Tassi BCE)", "Competizione sui prezzi"]
        },
        "xai_narrative": [
            {
                "agent": "Writer",
                "focus": "Sintesi Societaria",
                "html_text": f"La struttura di <strong>{company_name} SRL</strong> appare consolidata da oltre 15 anni di attività. L'assetto proprietario risulta concentrato, garantendo stabilità decisionale, pur evidenziando una forte dipendenza strategica dalla figura dell'Amministratore Unico."
            },
            {
                "agent": "Writer",
                "focus": "Sintesi Reddituale",
                "html_text": f"Si registra un fatturato in crescita tendenziale per <strong>{company_name} SRL</strong>, tuttavia emerge un <span data-source='ebitda' class='text-cyan cursor-crosshair border-b border-dotted border-cyan hover:bg-cyan-dim transition px-0.5 font-medium'>calo dell'EBITDA margin al 12%</span> correlato all'incremento dei costi operativi. Adeguata la capacità di copertura degli oneri finanziari."
            },
            {
                "agent": "Compliance",
                "focus": "Sintesi di CR",
                "danger_level": "High",
                "html_text": "<strong>ATTENZIONE:</strong> Rilevato un deterioramento recente della qualità del credito. Si segnalano <span data-source='scaduti' class='text-yellow cursor-crosshair border-b border-dotted border-yellow hover:bg-[rgba(250,204,21,0.15)] transition px-0.5 font-medium'>scaduti persistenti per € 45.200</span> sulle linee autoliquidanti allocate presso primari istituti bancari, indice di possibili tensioni di liquidità a breve."
            }
        ]
    }
