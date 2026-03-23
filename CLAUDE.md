# CLAUDE.md — Progetto Metis (ACE Engine)

## What is this project?

Metis is an AI-powered credit analysis engine ("Analisi Complementare Evoluta" — ACE) for Italian banks. It integrates into the PEF (Pratica Elettronica di Fido) workflow to automate and enhance credit underwriting for Corporate/SME borrowers.

The engine has **8 modules** (M1-M8) that cover the full credit analysis cycle: from historical comment synthesis to forecasting and SWOT generation. Every module must produce explainable output (XAI) and a complete audit trail for EU AI Act compliance.

## Project structure

```
metis-ace/
├── CLAUDE.md                    # You are here
├── docker-compose.yml           # Local dev environment
├── pyproject.toml               # Python project config (uv/poetry)
├── shared/                      # Shared libraries
│   ├── schemas/                 # Pydantic models (input/output for all modules)
│   ├── xai/                     # SHAP wrapper, explanation formatter
│   ├── audit/                   # Audit trail logger
│   ├── llm/                     # LLM client abstraction (OpenAI/Anthropic)
│   └── utils/                   # Common utilities
├── modules/
│   ├── m1_sintesi_pef/          # Historical PEF comment synthesis
│   ├── m2_web_sentiment/        # Web reputation & sentiment
│   ├── m3_kpi_bilancio/         # Balance sheet KPI analysis
│   ├── m4_benchmark_istat/      # ISTAT sector benchmarking
│   ├── m5_analisi_cr/           # Central Credit Register analysis
│   ├── m6_crosscheck/           # CR vs Balance sheet cross-check
│   ├── m7_forecast/             # DSCR prospective forecast
│   └── m8_swot/                 # SWOT matrix generation
├── orchestrator/                # Airflow/Prefect DAGs
├── api/                         # FastAPI application
├── dashboard/                   # Streamlit prototype UI
├── report_generator/            # PEF report builder (PDF/HTML)
├── data/                        # Synthetic datasets & fixtures
│   ├── synthetic/               # Generated test data
│   └── istat/                   # ISTAT benchmark data (public)
├── tests/                       # Integration tests
├── infrastructure/              # Docker, K8s, Terraform
└── docs/                        # Technical documentation
    ├── architecture/
    ├── modules/
    ├── prompts/
    └── schemas/
```

## Tech stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Language | Python 3.11+ | Use type hints everywhere |
| ML | scikit-learn, XGBoost, LightGBM | Tree-based for interpretability |
| LLM | Anthropic Claude API (primary), OpenAI fallback | Via shared/llm abstraction |
| XAI | SHAP (TreeExplainer + KernelExplainer) | Every prediction needs explanation |
| API | FastAPI | Auto-generated OpenAPI docs |
| DB | PostgreSQL 16 + TimescaleDB | Time-series for CR data |
| Queue | Redis (cache) + RabbitMQ (async jobs) | |
| Orchestration | Prefect (simpler than Airflow for prototype) | |
| Dashboard | Streamlit | Prototype only |
| Containers | Docker + docker-compose | |

## Development rules

1. **Every module is independent**: Own directory, own tests, own config. Communicate only via defined schemas.
2. **Schemas first**: Define Pydantic input/output models BEFORE writing logic. See `docs/schemas/`.
3. **XAI is not optional**: Every module that produces a score or prediction MUST generate SHAP explanations.
4. **Audit everything**: Every execution produces an immutable audit record. See `shared/audit/`.
5. **LLM calls go through abstraction**: Never call OpenAI/Anthropic directly. Use `shared/llm/client.py`.
6. **Italian banking domain**: All narratives in Italian. KPI names in Italian. Comments in code can be English.
7. **EU AI Act compliance**: Human-in-the-loop mandatory. No automated credit decisions. See `docs/architecture/compliance.md`.
8. **Test with synthetic data**: Never use real banking data. Generate with `data/synthetic/generator.py`.

## Build order (dependency graph)

```
Phase 0: shared/ (schemas, audit, llm, xai, utils)
Phase 1: M3 (KPI) + M6 (cross-check) — deterministic, easy to test
Phase 2: M1 (PEF synthesis) + M2 (web sentiment) — LLM-dependent
Phase 3: M5 (CR analysis) + M4 (ISTAT benchmark) — data-intensive
Phase 4: M7 (forecast) + M8 (SWOT) — depends on M3/M4/M5 outputs
Phase 5: orchestrator + api + report_generator + dashboard
```

Always start with Phase 0 (shared libraries) before any module.

## Key documentation files

| File | Purpose |
|------|---------|
| `docs/architecture/system_design.md` | Full architecture, data flow, infrastructure |
| `docs/architecture/compliance.md` | EU AI Act requirements mapped to modules |
| `docs/modules/M{n}_spec.md` | Detailed spec for each module |
| `docs/schemas/all_schemas.md` | All Pydantic schemas with examples |
| `docs/prompts/llm_prompts.md` | LLM prompt templates for M1, M2, M7, M8 |
| `docs/setup/getting_started.md` | How to set up local dev environment |

## Quick start

```bash
# 1. Clone and setup
git clone <repo-url> && cd metis-ace
cp .env.example .env  # Add your API keys

# 2. Start infrastructure
docker-compose up -d postgres redis rabbitmq

# 3. Install dependencies
pip install -e ".[dev]"

# 4. Generate synthetic data
python data/synthetic/generator.py

# 5. Run tests
pytest tests/ -v

# 6. Start API
uvicorn api.main:app --reload

# 7. Start dashboard
streamlit run dashboard/app.py
```
