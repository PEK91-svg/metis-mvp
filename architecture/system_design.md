# System Architecture — Progetto Metis (ACE)

## Overview

ACE is a microservices-based system with 4 layers:

```
┌─────────────────────────────────────────────────────┐
│                   PRESENTATION                       │
│   Streamlit Dashboard  │  Report Generator  │  API   │
├─────────────────────────────────────────────────────┤
│                    XAI ENGINE                         │
│   SHAP Server  │  Explainer API  │  Audit Logger     │
├─────────────────────────────────────────────────────┤
│                  PROCESSING CORE                      │
│   M1 │ M2 │ M3 │ M4 │ M5 │ M6 │ M7 │ M8           │
│   Orchestrator (Prefect)                              │
├─────────────────────────────────────────────────────┤
│                  DATA INGESTION                       │
│   API Gateway  │  ETL Pipeline  │  Data Validation   │
│   PostgreSQL + TimescaleDB  │  Redis  │  RabbitMQ    │
└─────────────────────────────────────────────────────┘
```

## Data flow (single PEF analysis)

```
1. TRIGGER
   Analyst clicks "Run ACE" in PEF UI → POST /api/v1/analysis/run
   Input: pratica_id, soggetto metadata

2. JOB CREATION
   API creates job record in PostgreSQL, publishes to RabbitMQ
   Returns: job_id, status=QUEUED

3. DATA COLLECTION (parallel)
   ├── Fetch bilancio data (from CBS mock / synthetic DB)
   ├── Fetch CR data (from CR mock / synthetic DB)
   ├── Fetch historical PEF comments (from PEF mock DB)
   └── Fetch web articles (from web scraper / mock)
   All raw data → staging tables with data quality scores

4. VALIDATION
   Schema validation (Pydantic)
   Completeness check (mandatory fields)
   Data quality scoring (0-100 per source)
   If quality < threshold → job status = NEEDS_REVIEW, notify analyst

5. MODULE EXECUTION (Prefect DAG)
   Dependency order:
   ┌── M1 (PEF synthesis) ──────────────────────┐
   ├── M2 (web sentiment) ──────────────────────┤
   ├── M3 (KPI analysis) ──┬── M4 (benchmark) ──┤
   │                        ├── M6 (cross-check) ┤
   │                        └── M7 (forecast) ───┤
   ├── M5 (CR analysis) ───┤                     │
   └────────────────────────┴── M8 (SWOT) ───────┘

   Each module:
   a. Reads input from staging
   b. Processes (ML/LLM/rules)
   c. Writes output JSON to results table
   d. Generates XAI explanation
   e. Writes audit record

6. REPORT GENERATION
   Merge all 8 module outputs into PEF narrative report
   Generate PDF + HTML versions
   Store in report_outputs table

7. HUMAN REVIEW
   Analyst reviews in dashboard
   Actions: CONFIRM / OVERRIDE (requires reason) / ESCALATE
   Each action → audit record
```

## Database schema (PostgreSQL)

```sql
-- Core tables
CREATE TABLE analysis_jobs (
    job_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pratica_id      VARCHAR(50) NOT NULL,
    soggetto_cf     VARCHAR(16) NOT NULL,
    soggetto_name   VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    -- QUEUED, COLLECTING, PROCESSING, COMPLETED, FAILED, NEEDS_REVIEW
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    created_by      VARCHAR(100) NOT NULL,
    metadata        JSONB
);

CREATE TABLE module_results (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID REFERENCES analysis_jobs(job_id),
    module_code     VARCHAR(5) NOT NULL, -- M1, M2, ..., M8
    status          VARCHAR(20) NOT NULL, -- PENDING, RUNNING, COMPLETED, FAILED
    input_hash      VARCHAR(64), -- SHA-256 of input data
    output_json     JSONB,
    xai_json        JSONB,
    latency_ms      INTEGER,
    model_version   VARCHAR(20),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    UNIQUE(job_id, module_code)
);

CREATE TABLE audit_trail (
    id              BIGSERIAL PRIMARY KEY,
    execution_id    UUID NOT NULL,
    job_id          UUID REFERENCES analysis_jobs(job_id),
    module_code     VARCHAR(5),
    action_type     VARCHAR(30) NOT NULL,
    -- MODULE_EXECUTED, HUMAN_CONFIRMED, HUMAN_OVERRIDDEN, HUMAN_ESCALATED
    actor           VARCHAR(100) NOT NULL, -- 'SYSTEM' or user_id
    input_hash      VARCHAR(64),
    output_hash     VARCHAR(64),
    override_reason TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata        JSONB
);
-- Partition by month for performance
-- CREATE INDEX idx_audit_job ON audit_trail(job_id);
-- CREATE INDEX idx_audit_ts ON audit_trail(timestamp);

CREATE TABLE data_staging (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID REFERENCES analysis_jobs(job_id),
    source_type     VARCHAR(30) NOT NULL, -- BILANCIO, CR, PEF_COMMENTS, WEB, ISTAT
    raw_data        JSONB NOT NULL,
    quality_score   FLOAT,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TimescaleDB hypertable for CR time-series
CREATE TABLE cr_timeseries (
    time            TIMESTAMPTZ NOT NULL,
    soggetto_cf     VARCHAR(16) NOT NULL,
    categoria       VARCHAR(10),
    accordato       NUMERIC(15,2),
    utilizzato      NUMERIC(15,2),
    sconfinamento   NUMERIC(15,2),
    sofferenze      NUMERIC(15,2),
    garanzie        NUMERIC(15,2),
    scaduto         NUMERIC(15,2)
);
SELECT create_hypertable('cr_timeseries', 'time');

-- Reports
CREATE TABLE reports (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID REFERENCES analysis_jobs(job_id),
    format          VARCHAR(10) NOT NULL, -- PDF, HTML
    content         BYTEA,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Human review actions
CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID REFERENCES analysis_jobs(job_id),
    module_code     VARCHAR(5), -- NULL = overall review
    action          VARCHAR(20) NOT NULL, -- CONFIRMED, OVERRIDDEN, ESCALATED
    reason          TEXT, -- mandatory if OVERRIDDEN
    reviewer_id     VARCHAR(100) NOT NULL,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## docker-compose.yml (dev environment)

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: metis
      POSTGRES_USER: metis
      POSTGRES_PASSWORD: metis_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infrastructure/sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: metis
      RABBITMQ_DEFAULT_PASS: metis_dev

volumes:
  pgdata:
```

## Environment variables (.env)

```bash
# Database
DATABASE_URL=postgresql://metis:metis_dev@localhost:5432/metis

# Redis
REDIS_URL=redis://localhost:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://metis:metis_dev@localhost:5672/

# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LLM_PROVIDER=anthropic  # or openai
LLM_MODEL=claude-sonnet-4-20250514

# Web scraping (M2)
WEB_SCRAPING_ENABLED=true
WEB_SCRAPING_RATE_LIMIT=2  # requests per second

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=json

# API
API_HOST=0.0.0.0
API_PORT=8000
JWT_SECRET=dev-secret-change-in-prod
```

## Configuration pattern

Each module has a `config.yaml`:

```yaml
# modules/m3_kpi_bilancio/config.yaml
module:
  code: M3
  name: "Analisi KPI Bilancio"
  version: "0.1.0"

sla:
  max_latency_ms: 5000
  availability_target: 0.995

thresholds:
  ebitda_margin_alert: 0.05       # < 5%
  leverage_alert: 4.0             # > 4x
  dscr_alert: 1.1                 # < 1.1
  interest_coverage_alert: 1.5    # < 1.5
  delta_negative_alert: 0.20      # > 20% negative change

xai:
  enabled: true
  method: "shap_tree"
  max_features_displayed: 10

model:
  type: "xgboost"
  path: "models/m3_risk_scorer_v1.joblib"
  fallback_path: "models/m3_risk_scorer_v0.joblib"
```

## Error handling pattern

Every module must follow this pattern:

```python
from shared.schemas.errors import ModuleError, ErrorSeverity

class ModuleResult:
    """Wrapper for all module outputs"""
    success: bool
    output: Optional[dict]
    errors: list[ModuleError]
    warnings: list[ModuleError]
    latency_ms: int
    xai: Optional[dict]

# In module execution:
try:
    result = process(input_data)
    return ModuleResult(success=True, output=result, ...)
except DataQualityError as e:
    # Recoverable: return partial result with warning
    return ModuleResult(success=True, output=partial, warnings=[...])
except Exception as e:
    # Unrecoverable: fail gracefully
    return ModuleResult(success=False, errors=[ModuleError(
        code="M3_UNEXPECTED",
        message=str(e),
        severity=ErrorSeverity.CRITICAL
    )])
```

## API endpoints

```
POST   /api/v1/analysis/run                 → Start full analysis
GET    /api/v1/analysis/{job_id}/status      → Job status
GET    /api/v1/analysis/{job_id}/results     → All module results
GET    /api/v1/analysis/{job_id}/module/{m}  → Single module result
GET    /api/v1/analysis/{job_id}/xai/{m}     → XAI explanation
POST   /api/v1/analysis/{job_id}/review      → Human review action
GET    /api/v1/analysis/{job_id}/report       → Download report
GET    /api/v1/audit/trail                    → Query audit trail
GET    /api/v1/health                         → Health check
GET    /api/v1/models/status                  → Model versions & metrics
```
