# Pydantic Schemas — All Modules

All input/output schemas for the 8 ACE modules. These go in `shared/schemas/`.
Implement EXACTLY as specified — modules communicate only through these schemas.

## Common types (`shared/schemas/common.py`)

```python
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime, date
from typing import Optional

class Trend(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    STABLE = "STABLE"

class Severity(str, Enum):
    OK = "OK"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class Sentiment(str, Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"

class Position(str, Enum):
    OUTPERFORMER = "OUTPERFORMER"
    INLINE = "INLINE"
    UNDERPERFORMER = "UNDERPERFORMER"

class Scenario(str, Enum):
    OPTIMISTIC = "OPTIMISTIC"
    BASE = "BASE"
    STRESS = "STRESS"

class Sustainability(str, Enum):
    SUSTAINABLE = "SUSTAINABLE"
    BORDERLINE = "BORDERLINE"
    UNSUSTAINABLE = "UNSUSTAINABLE"

class ReviewAction(str, Enum):
    CONFIRMED = "CONFIRMED"
    OVERRIDDEN = "OVERRIDDEN"
    ESCALATED = "ESCALATED"
    PENDING = "PENDING"

class ImpactLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ErrorSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class ModuleError(BaseModel):
    code: str
    message: str
    severity: ErrorSeverity

class DataQualityReport(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    completeness: float
    freshness: float
    consistency: float
    details: dict = {}

class XAIFeatureImportance(BaseModel):
    feature: str
    value: float
    impact: float
    direction: str  # "positive" or "negative"

class SourceAttribution(BaseModel):
    output_sentence: str
    source_text: str
    source_type: str  # "pef_comment", "bilancio", "cr", "web"
    confidence: float = Field(ge=0, le=1)

# Disclaimer constant - MUST appear in every output
AI_DISCLAIMER = "Output generato da sistema AI - richiede validazione umana"
```

## Soggetto (shared input)

```python
# shared/schemas/soggetto.py
class Soggetto(BaseModel):
    ragione_sociale: str
    codice_fiscale: str = Field(min_length=11, max_length=16)
    partita_iva: str = Field(min_length=11, max_length=11)
    codice_ateco: str = Field(pattern=r"^\d{2}\.\d{2}$")
    dimensione: str  # micro, piccola, media, grande
    provincia: str = Field(min_length=2, max_length=2)
    area_geografica: str  # Nord-Ovest, Nord-Est, Centro, Sud, Isole

class SoggettoCorrelato(BaseModel):
    ragione_sociale: str
    codice_fiscale: Optional[str] = None
    relazione: str  # "controllante", "controllata", "collegata", "garante"
```

## Analysis Job

```python
# shared/schemas/job.py
class AnalysisRequest(BaseModel):
    pratica_id: str
    soggetto: Soggetto
    soggetti_correlati: list[SoggettoCorrelato] = []
    moduli_richiesti: list[str] = ["M1","M2","M3","M4","M5","M6","M7","M8"]
    parametri: Optional[dict] = None

class AnalysisJobStatus(BaseModel):
    job_id: str
    status: str  # QUEUED, COLLECTING, PROCESSING, COMPLETED, FAILED, NEEDS_REVIEW
    progress: float = Field(ge=0, le=1)  # 0.0 to 1.0
    modules_completed: list[str] = []
    modules_failed: list[str] = []
    estimated_seconds: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
```

---

## M1 — Sintesi Commenti Storici PEF

```python
# shared/schemas/m1.py
class PEFComment(BaseModel):
    revisione: str           # "REV-2025-01", "REV-2024-02"
    data: date
    testo_andamentale: str
    testo_bilancio: str
    testo_cr: str

class M1Input(BaseModel):
    pratica_id: str
    commenti: list[PEFComment] = Field(min_length=1, max_length=5)

class DeltaHighlight(BaseModel):
    campo: str
    variazione: str
    rilevanza: ImpactLevel

class M1Output(BaseModel):
    sintesi_societaria: str = Field(min_length=100, max_length=2000)
    sintesi_bilancio: str = Field(min_length=100, max_length=2000)
    sintesi_cr: str = Field(min_length=100, max_length=2000)
    delta_highlights: list[DeltaHighlight]
    confidence_scores: dict[str, float]  # per paragraph
    source_attributions: list[SourceAttribution]
    disclaimer: str = AI_DISCLAIMER
```

## M2 — Sintesi Commenti da Fonti Web

```python
# shared/schemas/m2.py
class WebSource(BaseModel):
    url: str
    titolo: str
    data_pubblicazione: Optional[date] = None
    fonte: str              # "ilsole24ore", "ansa", "reuters", etc.
    estratto: str
    sentiment: Sentiment
    sentiment_score: float = Field(ge=0, le=1)

class SoggettoCorrelatoSentiment(BaseModel):
    nome: str
    relazione: str
    sentiment: Sentiment
    sintesi: str

class M2Input(BaseModel):
    soggetto: Soggetto
    soggetti_correlati: list[SoggettoCorrelato] = []

class M2Output(BaseModel):
    descrizione_attivita: str
    sentiment_complessivo: Sentiment
    sentiment_score: float = Field(ge=0, le=1)
    fonti: list[WebSource]
    soggetti_correlati: list[SoggettoCorrelatoSentiment] = []
    fonti_non_raggiungibili: list[str] = []  # URLs that failed
    disclaimer: str = AI_DISCLAIMER
```

## M3 — Analisi KPI Bilancio

```python
# shared/schemas/m3.py
class VoceBilancio(BaseModel):
    ricavi: float
    costi_operativi: float
    ebitda: float
    ammortamenti: float
    oneri_finanziari: float
    utile_netto: float
    attivo_totale: float
    patrimonio_netto: float
    debiti_finanziari_bt: float   # breve termine
    debiti_finanziari_mlt: float  # medio-lungo termine
    debiti_commerciali: float
    crediti_commerciali: float
    disponibilita_liquide: float
    attivo_corrente: float
    passivo_corrente: float
    numero_dipendenti: Optional[int] = None
    capex: Optional[float] = None
    imposte: Optional[float] = None

class KPIResult(BaseModel):
    nome: str                 # e.g. "EBITDA Margin"
    formula: str              # e.g. "EBITDA / Ricavi"
    valore_t0: float
    valore_t1: float
    delta_pct: float          # percentage change
    trend: Trend
    alert: bool
    soglia_alert: Optional[float] = None
    alert_message: Optional[str] = None

class M3Input(BaseModel):
    soggetto: Soggetto
    bilancio_t0: VoceBilancio
    bilancio_t1: VoceBilancio
    anno_t0: int
    anno_t1: int

class M3Output(BaseModel):
    kpi: list[KPIResult]
    risk_score: float = Field(ge=0, le=1)
    risk_level: Severity
    narrativa: str
    xai: dict                 # SHAP values
    disclaimer: str = AI_DISCLAIMER
```

## M4 — Benchmarking Settoriale ISTAT

```python
# shared/schemas/m4.py
class BenchmarkKPI(BaseModel):
    kpi_nome: str
    valore_azienda: float
    mediana_settore: float
    percentile_25: float
    percentile_75: float
    percentile_azienda: float  # where the company falls
    posizione: Position

class M4Input(BaseModel):
    kpi_aziendali: list[KPIResult]   # from M3 output
    codice_ateco: str
    dimensione: str
    area_geografica: str

class M4Output(BaseModel):
    confronto: list[BenchmarkKPI]
    posizione_complessiva: Position
    punti_forza: list[str]
    punti_debolezza: list[str]
    narrativa: str
    dataset_anno: int          # reference year of ISTAT data
    disclaimer: str = AI_DISCLAIMER
```

## M5 — Analisi Dati CR (12 mesi)

```python
# shared/schemas/m5.py
class CRMonthlyData(BaseModel):
    mese: date
    accordato: float
    utilizzato: float
    sconfinamento: float
    sofferenze: float
    garanzie_ricevute: float
    scaduto: float
    categoria_censimento: Optional[str] = None

class CRAnomaly(BaseModel):
    tipo: str                  # "sconfinamento_persistente", "utilizzo_picco", etc.
    descrizione: str
    mese_rilevazione: date
    valore_anomalo: float
    valore_atteso: float
    z_score: float
    transitoria: bool          # True if resolved within 60 days
    evidenza: str

class CRMetric(BaseModel):
    metrica: str
    valore_ultimo: float
    media_12m: float
    delta: float
    classificazione: Severity

class M5Input(BaseModel):
    soggetto: Soggetto
    cr_data: list[CRMonthlyData] = Field(min_length=6, max_length=24)

class M5Output(BaseModel):
    metriche: list[CRMetric]
    anomalie: list[CRAnomaly]
    risk_score_cr: float = Field(ge=0, le=1)
    risk_level: Severity
    narrativa: str
    xai: dict                  # SHAP values for risk_score_cr
    disclaimer: str = AI_DISCLAIMER
```

## M6 — Cross-Check CR vs Bilancio

```python
# shared/schemas/m6.py
class M6Input(BaseModel):
    debiti_bancari_bilancio: dict  # {breve_termine, medio_lungo, totale}
    utilizzato_cr: dict           # {totale, per_categoria: [{cat, importo}]}
    data_bilancio: date
    data_cr: date

class ScadenzaDetail(BaseModel):
    tipo: str                     # "breve_termine", "medio_lungo"
    bilancio: float
    cr: float
    delta_pct: float
    alert: bool

class M6Output(BaseModel):
    delta_pct_totale: float
    alert: bool
    severity: Severity
    gap_temporale_giorni: int     # days between bilancio and CR dates
    possibili_cause: list[str]
    raccomandazione: str
    dettaglio_per_scadenza: list[ScadenzaDetail]
    narrativa: str
    disclaimer: str = AI_DISCLAIMER
```

## M7 — Analisi Forecast (DSCR Prospettico)

```python
# shared/schemas/m7.py
class ScenarioResult(BaseModel):
    tipo: Scenario
    ricavi_proiettati: float
    ebitda_proiettato: float
    oneri_finanziari_proiettati: float
    quota_capitale_annua: float
    dscr_12m: float
    probabilita_default: float = Field(ge=0, le=1)
    sostenibilita: Sustainability

class SensitivityRow(BaseModel):
    variabile: str
    variazione: str           # e.g. "+10%", "-15%"
    dscr_risultante: float
    delta_dscr: float

class M7Input(BaseModel):
    bilancio: M3Input          # reuse M3 input (has t0 and t1)
    cr_analysis: M5Output      # from M5
    benchmark: Optional[M4Output] = None  # from M4
    tassi_interesse_base: float = 0.04    # ECB rate
    inflazione_attesa: float = 0.02

class M7Output(BaseModel):
    scenari: list[ScenarioResult]
    scenario_selezionato: Scenario
    motivazione_selezione: str
    sensitivity_table: list[SensitivityRow]
    narrativa: str
    xai: dict                  # SHAP for scenario selection
    disclaimer: str = AI_DISCLAIMER
```

## M8 — SWOT Analysis

```python
# shared/schemas/m8.py
class SWOTItem(BaseModel):
    item: str
    evidenza: str              # quantitative evidence
    impatto: ImpactLevel
    source_module: str         # "M3", "M4", "M5", "M2" — traceability

class MacroIndicatori(BaseModel):
    pil_regionale: Optional[float] = None
    tasso_disoccupazione: Optional[float] = None
    indice_produzione_settore: Optional[float] = None
    inflazione: Optional[float] = None
    tassi_interesse: Optional[float] = None

class M8Input(BaseModel):
    kpi_analysis: M3Output
    benchmark: Optional[M4Output] = None
    cr_analysis: Optional[M5Output] = None
    web_sentiment: Optional[M2Output] = None
    soggetto: Soggetto
    macro_indicatori: MacroIndicatori = MacroIndicatori()

class M8Output(BaseModel):
    forze: list[SWOTItem]
    debolezze: list[SWOTItem]
    opportunita: list[SWOTItem]
    minacce: list[SWOTItem]
    score_complessivo: float = Field(ge=0, le=1)
    raccomandazione_strategica: str
    narrativa: str
    disclaimer: str = AI_DISCLAIMER
```

## Module Result wrapper

```python
# shared/schemas/result.py
class ModuleResult(BaseModel):
    """Universal wrapper for all module outputs"""
    module_code: str
    success: bool
    output: Optional[dict] = None    # The actual M{n}Output serialized
    errors: list[ModuleError] = []
    warnings: list[ModuleError] = []
    latency_ms: int
    xai: Optional[dict] = None
    data_quality: Optional[DataQualityReport] = None
    model_version: Optional[str] = None
    disclaimer: str = AI_DISCLAIMER
```

## Review schemas

```python
# shared/schemas/review.py
class ReviewRequest(BaseModel):
    job_id: str
    module_code: Optional[str] = None  # None = overall
    action: ReviewAction
    reason: Optional[str] = None

    @validator("reason")
    def override_needs_reason(cls, v, values):
        if values.get("action") == ReviewAction.OVERRIDDEN and not v:
            raise ValueError("Motivazione obbligatoria per override")
        return v

class ReviewResponse(BaseModel):
    review_id: str
    job_id: str
    action: ReviewAction
    reviewer: str
    timestamp: datetime
```
