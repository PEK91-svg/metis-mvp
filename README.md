# 🏛️ METIS — Agentic Glass-Box Credit Underwriting

> **AI-powered PEF (Pratica Elettronica di Fido) workflow for corporate credit analysts.**  
> Compliant with EU AI Act — No Black-Box scoring. Human-in-the-loop only.

![Stack](https://img.shields.io/badge/Next.js_16-black?logo=next.js) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-06B6D4?logo=tailwindcss&logoColor=white) ![Python](https://img.shields.io/badge/Python_3.14-3776AB?logo=python&logoColor=white)

---

## What is Metis?

Metis replaces the 6–9 hour manual credit underwriting process with an **agentic multi-agent AI swarm** that reads, extracts, calculates, and writes the entire PEF dossier in under 30 seconds.

Unlike black-box AI scoring tools, Metis is a **Glass-Box** system:
- 🔍 Every AI-generated sentence links back to its source document (XAI Traceability)
- 🧮 All financial math (DSCR, Altman Z-Score, PD) is computed by **deterministic Python**, not LLMs
- 🇪🇺 The human analyst makes all final decisions (EU AI Act compliant)

---

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Next.js 16 │◄───►│   FastAPI Backend     │◄───►│  DuckDuckGo API │
│  (React UI) │     │  (Agent Orchestrator) │     │  (Live Crawl)   │
└─────────────┘     └──────────────────────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Agent_OCR    Agent_Math    Agent_Writer
        (LlamaParse) (Python)     (GPT-4o XAI)
```

---

## Quick Start

### 1. Backend (Python)
```bash
cd metis-backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React)
```bash
cd metis-app
npm install
npm run dev
```

### 3. Open
Navigate to **http://localhost:3000**, upload a document, and watch the swarm work.

---

## Features (8 Core Modules)

| # | Module | Description |
|---|--------|-------------|
| 1 | **Narrative PEF** | AI-generated credit analysis text with XAI source linking |
| 2 | **Web Sentiment** | Live DuckDuckGo crawling + NLP keyword scoring |
| 3 | **Financial KPIs** | DSCR, EBITDA, Altman Z-Score (deterministic math) |
| 4 | **ATECO Benchmark** | Sector comparison against ISTAT averages |
| 5 | **CR Pattern 12M** | Central Risk Registry usage trend (sparkline chart) |
| 6 | **Cross-Check** | Balance sheet vs CR mismatch detection (semaphore) |
| 7 | **EU AI Act** | Permanent compliance disclaimer banner |
| 8 | **SWOT Matrix** | Auto-generated 2x2 strengths/weaknesses grid |

Plus: **Delibera Action Bar** (Approve / Request Integration / Decline)

---

## Project Structure

```
metis/
├── metis-app/          # Next.js 16 + TailwindCSS v4 frontend
│   └── src/app/
│       ├── page.tsx    # Main dashboard (3-column Glass-Box UI)
│       ├── layout.tsx  # Root layout (Space Grotesk + Inter fonts)
│       └── globals.css # Design system tokens (Midnight Void theme)
├── metis-backend/      # FastAPI Python backend
│   ├── main.py         # Agent orchestrator + DuckDuckGo crawler
│   └── requirements.txt
├── metis_dashboard.html # Standalone HTML prototype
├── Bilancio_DeltaMeccanica.txt # Test document
└── README.md
```

---

## License

MIT © 2026
