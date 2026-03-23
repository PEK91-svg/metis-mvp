# Getting Started — Progetto Metis Development

## Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Node.js 18+ (for Streamlit plugins if needed)
- Git
- An Anthropic API key OR OpenAI API key

## Step 1: Project initialization

```bash
# Create project structure
mkdir -p metis-ace/{shared/{schemas,xai,audit,llm,utils,data,risk,monitoring},modules/{m1_sintesi_pef/{src,prompts,tests/fixtures},m2_web_sentiment/{src,prompts,tests/fixtures},m3_kpi_bilancio/{src,models,tests/fixtures},m4_benchmark_istat/{src,data,tests/fixtures},m5_analisi_cr/{src,models,tests/fixtures},m6_crosscheck/{src,tests/fixtures},m7_forecast/{src,models,prompts,tests/fixtures},m8_swot/{src,prompts,tests/fixtures}},orchestrator,api/{routes,middleware},dashboard,report_generator,data/{synthetic,istat},tests,infrastructure/sql,docs}

cd metis-ace
git init
```

## Step 2: Python project setup

```toml
# pyproject.toml
[project]
name = "metis-ace"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    # Core
    "fastapi>=0.109",
    "uvicorn[standard]>=0.27",
    "pydantic>=2.5",
    "python-dotenv>=1.0",

    # Database
    "sqlalchemy>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "psycopg2-binary>=2.9",

    # ML/AI
    "scikit-learn>=1.4",
    "xgboost>=2.0",
    "lightgbm>=4.2",
    "shap>=0.44",
    "numpy>=1.26",
    "pandas>=2.2",
    "scipy>=1.12",

    # LLM
    "anthropic>=0.43",
    "openai>=1.10",

    # NLP
    "transformers>=4.37",
    "torch>=2.1",
    "sentence-transformers>=2.3",

    # Web scraping (M2)
    "httpx>=0.26",
    "beautifulsoup4>=4.12",
    "lxml>=5.1",

    # Queue & Cache
    "redis>=5.0",
    "pika>=1.3",  # RabbitMQ

    # Orchestration
    "prefect>=2.14",

    # Dashboard
    "streamlit>=1.30",
    "plotly>=5.18",

    # Report generation
    "jinja2>=3.1",
    "weasyprint>=61",  # PDF generation

    # Utils
    "structlog>=24.1",
    "pyyaml>=6.0",
    "joblib>=1.3",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.1",
    "httpx>=0.26",  # for testing FastAPI
    "ruff>=0.2",
    "mypy>=1.8",
    "faker>=22.0",  # for synthetic data generation
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests", "modules"]

[tool.ruff]
line-length = 120
target-version = "py311"
```

```bash
pip install -e ".[dev]"
```

## Step 3: Database setup

```bash
# Start infrastructure
docker-compose up -d postgres redis rabbitmq

# Wait for postgres to be ready
sleep 5

# Run init SQL
docker exec -i metis-ace-postgres-1 psql -U metis -d metis < infrastructure/sql/init.sql
```

Create `infrastructure/sql/init.sql` with the schema from `docs/architecture/system_design.md`.

## Step 4: Environment configuration

```bash
# .env
DATABASE_URL=postgresql://metis:metis_dev@localhost:5432/metis
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://metis:metis_dev@localhost:5672/
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=DEBUG
LOG_FORMAT=json
API_HOST=0.0.0.0
API_PORT=8000
JWT_SECRET=dev-secret-change-in-prod
WEB_SCRAPING_ENABLED=false
```

## Step 5: Build shared libraries FIRST

Build order within `shared/`:

```
1. shared/schemas/common.py     → Enums, base types
2. shared/schemas/soggetto.py   → Soggetto model
3. shared/schemas/m*.py         → All module schemas
4. shared/schemas/job.py        → Job schemas
5. shared/schemas/result.py     → ModuleResult wrapper
6. shared/utils/config.py       → YAML config loader
7. shared/audit/logger.py       → Audit trail
8. shared/llm/client.py         → LLM abstraction
9. shared/xai/shap_explainer.py → SHAP wrapper
10. shared/xai/source_attribution.py → LLM attribution
11. shared/data/quality.py      → Data quality scorer
12. shared/risk/monitor.py      → Risk monitoring
13. shared/module_base.py       → Base class for modules
```

## Step 6: Generate synthetic data

```python
# data/synthetic/generator.py
"""
Generates realistic test data for all 8 modules.
Run: python data/synthetic/generator.py
Output: data/synthetic/*.json
"""
import json
import random
from datetime import date, timedelta
from faker import Faker

fake = Faker("it_IT")

def generate_companies(n=50):
    """Generate n synthetic companies with balance sheets and CR data"""
    companies = []
    for i in range(n):
        # 80% healthy, 15% stressed, 5% defaulted
        profile = random.choices(["healthy", "stressed", "defaulted"], weights=[80, 15, 5])[0]

        company = {
            "id": f"SUBJ-{i:04d}",
            "ragione_sociale": fake.company(),
            "codice_fiscale": fake.ssn(),  # fake CF
            "partita_iva": f"{random.randint(10000000000, 99999999999)}",
            "codice_ateco": random.choice(["28.11", "46.90", "41.20", "62.01", "10.71", "25.11"]),
            "dimensione": random.choice(["micro", "piccola", "media"]),
            "provincia": random.choice(["MI", "RM", "TO", "NA", "BO", "FI", "PA", "CT"]),
            "profile": profile,
            "bilancio_t0": generate_bilancio(profile, year=2025),
            "bilancio_t1": generate_bilancio(profile, year=2024),
            "cr_data": generate_cr_data(profile, months=12),
            "pef_comments": generate_pef_comments(profile),
        }
        companies.append(company)
    return companies

def generate_bilancio(profile, year):
    """Generate realistic balance sheet based on company profile"""
    if profile == "healthy":
        ricavi = random.uniform(2_000_000, 50_000_000)
        ebitda_margin = random.uniform(0.08, 0.20)
    elif profile == "stressed":
        ricavi = random.uniform(500_000, 10_000_000)
        ebitda_margin = random.uniform(0.02, 0.06)
    else:  # defaulted
        ricavi = random.uniform(200_000, 5_000_000)
        ebitda_margin = random.uniform(-0.05, 0.02)

    ebitda = ricavi * ebitda_margin
    costi = ricavi - ebitda
    ammortamenti = ricavi * random.uniform(0.03, 0.08)
    oneri_fin = ricavi * random.uniform(0.01, 0.04)
    utile = ebitda - ammortamenti - oneri_fin - (ebitda * 0.24)  # rough IRES

    attivo = ricavi * random.uniform(0.8, 2.0)
    pn = attivo * random.uniform(0.15, 0.50)
    debiti_fin_bt = attivo * random.uniform(0.05, 0.20)
    debiti_fin_mlt = attivo * random.uniform(0.10, 0.40)
    debiti_comm = ricavi * random.uniform(0.08, 0.15)
    crediti_comm = ricavi * random.uniform(0.10, 0.20)
    liquidita = attivo * random.uniform(0.02, 0.15)

    return {
        "anno": year,
        "ricavi": round(ricavi, 2),
        "costi_operativi": round(costi, 2),
        "ebitda": round(ebitda, 2),
        "ammortamenti": round(ammortamenti, 2),
        "oneri_finanziari": round(abs(oneri_fin), 2),
        "utile_netto": round(utile, 2),
        "attivo_totale": round(attivo, 2),
        "patrimonio_netto": round(pn, 2),
        "debiti_finanziari_bt": round(debiti_fin_bt, 2),
        "debiti_finanziari_mlt": round(debiti_fin_mlt, 2),
        "debiti_commerciali": round(debiti_comm, 2),
        "crediti_commerciali": round(crediti_comm, 2),
        "disponibilita_liquide": round(liquidita, 2),
        "attivo_corrente": round(crediti_comm + liquidita + ricavi * 0.05, 2),
        "passivo_corrente": round(debiti_fin_bt + debiti_comm, 2),
        "numero_dipendenti": random.randint(5, 200),
    }

def generate_cr_data(profile, months=12):
    """Generate monthly CR data with realistic patterns"""
    base_date = date(2025, 12, 1)
    data = []
    accordato = random.uniform(500_000, 5_000_000)

    for m in range(months):
        month_date = base_date - timedelta(days=30 * (months - 1 - m))

        if profile == "healthy":
            utilizzato = accordato * random.uniform(0.4, 0.7)
            sconf = 0
            soff = 0
            scaduto = 0
        elif profile == "stressed":
            utilizzato = accordato * random.uniform(0.7, 0.95)
            sconf = accordato * random.uniform(0, 0.05)
            soff = 0
            scaduto = accordato * random.uniform(0, 0.03)
        else:
            utilizzato = accordato * random.uniform(0.85, 1.0)
            sconf = accordato * random.uniform(0.05, 0.15)
            soff = accordato * random.uniform(0.02, 0.10)
            scaduto = accordato * random.uniform(0.05, 0.10)

        data.append({
            "mese": month_date.isoformat(),
            "accordato": round(accordato, 2),
            "utilizzato": round(utilizzato, 2),
            "sconfinamento": round(sconf, 2),
            "sofferenze": round(soff, 2),
            "garanzie_ricevute": round(accordato * random.uniform(0, 0.3), 2),
            "scaduto": round(scaduto, 2),
        })
    return data

def generate_pef_comments(profile):
    """Generate realistic PEF review comments"""
    # Use templates — in real prototype, generate with LLM for variety
    templates = {
        "healthy": {
            "andamentale": "La società presenta un andamento regolare con trend positivo. La gestione operativa è efficiente e il management dimostra capacità di adattamento al mercato.",
            "bilancio": "I dati di bilancio confermano la solidità patrimoniale. L'EBITDA margin è in crescita e il livello di indebitamento è contenuto. La struttura finanziaria risulta equilibrata.",
            "cr": "Il comportamento in Centrale Rischi è regolare. Non si rilevano sconfinamenti né insoluti. L'utilizzo delle linee è coerente con il volume d'affari.",
        },
        "stressed": {
            "andamentale": "La società attraversa una fase di tensione legata alla contrazione del mercato di riferimento. Il management sta implementando un piano di ristrutturazione.",
            "bilancio": "I dati di bilancio evidenziano una contrazione della redditività. L'EBITDA margin è sotto pressione e il livello di leverage è in aumento.",
            "cr": "Si rilevano episodi di tensione nell'utilizzo delle linee. Alcuni sconfinamenti di natura tecnica sono stati registrati, con rientro nei limiti entro 30 giorni.",
        },
        "defaulted": {
            "andamentale": "La società presenta segnali critici di deterioramento. Il volume d'affari è in contrazione significativa e sono emerse difficoltà nel rispetto dei covenants.",
            "bilancio": "I dati di bilancio evidenziano una situazione patrimoniale critica. L'EBITDA è negativo e il patrimonio netto è eroso.",
            "cr": "Si rilevano sconfinamenti persistenti e scaduti in aumento. La posizione è sotto osservazione con alert automatici attivi.",
        },
    }

    return [
        {
            "revisione": "REV-2025-02",
            "data": "2025-06-15",
            **templates[profile],
        },
        {
            "revisione": "REV-2024-02",
            "data": "2024-06-15",
            **{k: v.replace("è in crescita", "era stabile").replace("in aumento", "in lieve crescita")
               for k, v in templates[profile].items()},
        },
    ]


if __name__ == "__main__":
    companies = generate_companies(50)
    with open("data/synthetic/companies.json", "w") as f:
        json.dump(companies, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(companies)} synthetic companies")
    print(f"  Healthy: {sum(1 for c in companies if c['profile'] == 'healthy')}")
    print(f"  Stressed: {sum(1 for c in companies if c['profile'] == 'stressed')}")
    print(f"  Defaulted: {sum(1 for c in companies if c['profile'] == 'defaulted')}")
```

## Step 7: Implement modules (follow build order)

Refer to `docs/modules/all_modules_spec.md` for each module.

**Phase 1 (Week 3-6):** M3 + M6 — Start here, they are deterministic and easiest to test.
**Phase 2 (Week 5-8):** M1 + M2 — LLM integration.
**Phase 3 (Week 7-10):** M5 + M4 — Statistical analysis.
**Phase 4 (Week 9-12):** M7 + M8 — Complex dependencies.

## Step 8: Run tests

```bash
# Unit tests for a specific module
pytest modules/m3_kpi_bilancio/tests/ -v

# All unit tests
pytest modules/ -v

# Integration tests
pytest tests/ -v

# With coverage
pytest --cov=shared --cov=modules --cov-report=html
```

## Step 9: Start the API

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# OpenAPI docs at http://localhost:8000/docs
```

## Step 10: Start the dashboard

```bash
streamlit run dashboard/app.py
# Opens at http://localhost:8501
```
