# Module Specifications — M1 through M8

Detailed implementation guide for each module. Each module is an independent Python package
in `modules/m{n}/` with this structure:

```
modules/m{n}/
├── __init__.py
├── config.yaml          # Module configuration
├── src/
│   ├── __init__.py
│   ├── processor.py     # Main business logic
│   ├── validator.py     # Input validation
│   └── explainer.py     # XAI for this module
├── prompts/             # LLM prompts (if applicable)
│   └── *.txt
├── models/              # Trained ML models (if applicable)
│   └── *.joblib
└── tests/
    ├── __init__.py
    ├── test_processor.py
    ├── test_validator.py
    └── fixtures/
        └── *.json       # Test data
```

Every module must implement this interface:

```python
# shared/module_base.py
from abc import ABC, abstractmethod

class ModuleBase(ABC):
    """Base class for all ACE modules"""

    def __init__(self, config_path: str):
        self.config = load_yaml(config_path)
        self.audit = AuditLogger()
        self.quality = DataQualityScorer()

    @abstractmethod
    def process(self, input_data: BaseModel) -> ModuleResult:
        """Main processing logic"""
        ...

    def run(self, input_data: BaseModel) -> ModuleResult:
        """Orchestrated execution with validation, logging, XAI"""
        start = time.time()

        # 1. Validate input
        quality = self.quality.score(input_data.dict(), type(input_data))
        if quality.overall_score < self.config["min_quality_score"]:
            return ModuleResult(success=False, errors=[...])

        # 2. Process
        try:
            result = self.process(input_data)
        except Exception as e:
            self.audit.log(error=True, ...)
            return ModuleResult(success=False, errors=[...])

        # 3. XAI
        xai = self.explain(input_data, result) if self.config["xai"]["enabled"] else None

        # 4. Audit
        latency = int((time.time() - start) * 1000)
        self.audit.log(
            module_code=self.config["module"]["code"],
            input_hash=AuditLogger.hash_data(input_data.dict()),
            output_hash=AuditLogger.hash_data(result.dict()),
            latency_ms=latency,
            model_version=self.config["module"]["version"],
        )

        return ModuleResult(
            module_code=self.config["module"]["code"],
            success=True,
            output=result.dict(),
            latency_ms=latency,
            xai=xai,
            data_quality=quality,
            model_version=self.config["module"]["version"],
        )

    @abstractmethod
    def explain(self, input_data, output) -> dict:
        """Generate XAI explanation"""
        ...
```

---

## M1 — Sintesi Commenti Storici PEF

**Type:** LLM-based (text synthesis)
**Dependencies:** None (standalone)
**Complexity:** Medium

### Implementation

```python
# modules/m1_sintesi_pef/src/processor.py

class M1Processor(ModuleBase):
    def __init__(self):
        super().__init__("modules/m1_sintesi_pef/config.yaml")
        self.llm = LLMClient()
        self.system_prompt = load_prompt("modules/m1_sintesi_pef/prompts/system.txt")
        self.user_template = load_prompt("modules/m1_sintesi_pef/prompts/user.txt")

    def process(self, input_data: M1Input) -> M1Output:
        # 1. Build user prompt from template
        user_prompt = self._build_prompt(input_data)

        # 2. Call LLM
        response = self.llm.generate_json(
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            max_tokens=2000,
        )

        # 3. Validate response
        output = M1Output(**response)

        # 4. Post-validation: check no hallucinated numbers
        self._validate_no_hallucination(output, input_data)

        return output

    def _validate_no_hallucination(self, output: M1Output, input_data: M1Input):
        """
        Extract all numbers from output text.
        Verify each number exists in input text.
        Flag any number not found in source.
        """
        output_numbers = extract_numbers(output.sintesi_bilancio + output.sintesi_cr)
        input_text = " ".join([c.testo_bilancio + c.testo_cr for c in input_data.commenti])
        input_numbers = extract_numbers(input_text)

        for num in output_numbers:
            if num not in input_numbers:
                # Not a hallucination-stopper, but flag as warning
                output.delta_highlights.append(DeltaHighlight(
                    campo="ATTENZIONE",
                    variazione=f"Numero {num} non trovato nei commenti fonte",
                    rilevanza="HIGH"
                ))

    def explain(self, input_data, output) -> dict:
        """Source attribution for LLM output"""
        attributor = SourceAttribution()
        return {
            "source_attributions": attributor.attribute(
                output_text=output.sintesi_societaria + output.sintesi_bilancio + output.sintesi_cr,
                input_texts=[c.testo_andamentale + c.testo_bilancio + c.testo_cr for c in input_data.commenti]
            ),
            "confidence_per_paragraph": output.confidence_scores,
        }
```

### Tests

```python
# Test: output contains 3 non-empty paragraphs
# Test: delta_highlights is non-empty when input has 2 different revisions
# Test: no numbers appear in output that aren't in input
# Test: handles single revision gracefully (no delta)
# Test: handles empty comment fields with warning
# Test: output is valid JSON matching M1Output schema
```

---

## M2 — Sintesi Commenti da Fonti Web

**Type:** Web scraping + NLP + LLM
**Dependencies:** None (standalone)
**Complexity:** High (external dependencies)

### Implementation

```python
# modules/m2_web_sentiment/src/processor.py

WHITELIST_SOURCES = [
    {"name": "ilsole24ore", "base_url": "https://www.ilsole24ore.com", "selector": "..."},
    {"name": "ansa", "base_url": "https://www.ansa.it", "selector": "..."},
    {"name": "reuters_it", "base_url": "https://www.reuters.com/it", "selector": "..."},
    {"name": "registroimprese", "base_url": "https://www.registroimprese.it", "selector": "..."},
]

class M2Processor(ModuleBase):
    def __init__(self):
        super().__init__("modules/m2_web_sentiment/config.yaml")
        self.scraper = WebScraper(rate_limit=2)  # 2 req/sec
        self.sentiment_model = FinBERTSentiment()  # or load from HF
        self.llm = LLMClient()

    def process(self, input_data: M2Input) -> M2Output:
        # 1. Scrape web sources
        articles = self.scraper.search(
            query=input_data.soggetto.ragione_sociale,
            sources=WHITELIST_SOURCES,
            max_per_source=5,
        )

        # 2. Sentiment analysis on each article
        for article in articles:
            sentiment, score = self.sentiment_model.predict(article.text)
            article.sentiment = sentiment
            article.sentiment_score = score

        # 3. LLM synthesis
        narrative = self.llm.generate_json(
            system_prompt=self.system_prompt,
            user_prompt=self._build_prompt(input_data, articles),
        )

        # 4. Aggregate sentiment
        overall_sentiment, overall_score = self._aggregate_sentiment(articles)

        return M2Output(
            descrizione_attivita=narrative["descrizione_attivita"],
            sentiment_complessivo=overall_sentiment,
            sentiment_score=overall_score,
            fonti=[self._to_web_source(a) for a in articles],
            soggetti_correlati=narrative.get("soggetti_correlati_sintesi", []),
            fonti_non_raggiungibili=self.scraper.failed_urls,
        )

    def _aggregate_sentiment(self, articles) -> tuple[Sentiment, float]:
        """Weighted average: more recent and more authoritative sources get higher weight"""
        if not articles:
            return Sentiment.NEUTRAL, 0.5
        scores = [a.sentiment_score for a in articles]
        avg = sum(scores) / len(scores)
        if avg > 0.6: return Sentiment.POSITIVE, avg
        if avg < 0.4: return Sentiment.NEGATIVE, avg
        return Sentiment.NEUTRAL, avg
```

### For prototype: Mock scraper

```python
# For prototype, use mock data instead of real scraping
class MockWebScraper:
    """Returns synthetic articles from data/synthetic/web_articles.json"""
    def search(self, query, sources, max_per_source):
        articles = load_json("data/synthetic/web_articles.json")
        return [a for a in articles if query.lower() in a["text"].lower()][:max_per_source * len(sources)]
```

---

## M3 — Analisi KPI Bilancio

**Type:** Deterministic calculation + ML scoring
**Dependencies:** None
**Complexity:** Medium
**Priority:** Build FIRST (Phase 1)

### KPI formulas (implement exactly)

```python
# modules/m3_kpi_bilancio/src/kpi_calculator.py

def calculate_kpis(t0: VoceBilancio, t1: VoceBilancio) -> list[KPIResult]:
    kpis = []

    # 1. EBITDA Margin
    kpis.append(kpi("EBITDA Margin", "EBITDA / Ricavi",
        t0.ebitda / t0.ricavi if t0.ricavi else 0,
        t1.ebitda / t1.ricavi if t1.ricavi else 0,
        alert_below=0.05))

    # 2. ROE
    kpis.append(kpi("ROE", "Utile Netto / Patrimonio Netto",
        t0.utile_netto / t0.patrimonio_netto if t0.patrimonio_netto else 0,
        t1.utile_netto / t1.patrimonio_netto if t1.patrimonio_netto else 0,
        alert_below=0.02))

    # 3. ROA
    kpis.append(kpi("ROA", "Utile Netto / Attivo Totale",
        t0.utile_netto / t0.attivo_totale if t0.attivo_totale else 0,
        t1.utile_netto / t1.attivo_totale if t1.attivo_totale else 0,
        alert_below=0.01))

    # 4. Leverage (D/E)
    debt_t0 = t0.debiti_finanziari_bt + t0.debiti_finanziari_mlt
    debt_t1 = t1.debiti_finanziari_bt + t1.debiti_finanziari_mlt
    kpis.append(kpi("Leverage (D/E)", "Debiti Finanziari / Patrimonio Netto",
        debt_t0 / t0.patrimonio_netto if t0.patrimonio_netto else 0,
        debt_t1 / t1.patrimonio_netto if t1.patrimonio_netto else 0,
        alert_above=4.0))

    # 5. Current Ratio
    kpis.append(kpi("Current Ratio", "Attivo Corrente / Passivo Corrente",
        t0.attivo_corrente / t0.passivo_corrente if t0.passivo_corrente else 0,
        t1.attivo_corrente / t1.passivo_corrente if t1.passivo_corrente else 0,
        alert_below=1.0))

    # 6. Interest Coverage
    kpis.append(kpi("Interest Coverage", "EBITDA / Oneri Finanziari",
        t0.ebitda / t0.oneri_finanziari if t0.oneri_finanziari else float('inf'),
        t1.ebitda / t1.oneri_finanziari if t1.oneri_finanziari else float('inf'),
        alert_below=1.5))

    # 7. NFP/EBITDA
    nfp_t0 = debt_t0 - t0.disponibilita_liquide
    nfp_t1 = debt_t1 - t1.disponibilita_liquide
    kpis.append(kpi("NFP/EBITDA", "(Debiti Fin. - Liquidità) / EBITDA",
        nfp_t0 / t0.ebitda if t0.ebitda else float('inf'),
        nfp_t1 / t1.ebitda if t1.ebitda else float('inf'),
        alert_above=5.0))

    # 8. DSO (Days Sales Outstanding)
    kpis.append(kpi("DSO", "Crediti Commerciali / Ricavi × 365",
        t0.crediti_commerciali / t0.ricavi * 365 if t0.ricavi else 0,
        t1.crediti_commerciali / t1.ricavi * 365 if t1.ricavi else 0,
        alert_above=120))

    # 9. DPO (Days Payable Outstanding)
    kpis.append(kpi("DPO", "Debiti Commerciali / Costi Operativi × 365",
        t0.debiti_commerciali / t0.costi_operativi * 365 if t0.costi_operativi else 0,
        t1.debiti_commerciali / t1.costi_operativi * 365 if t1.costi_operativi else 0,
        alert_above=180))

    return kpis


def kpi(nome, formula, val_t0, val_t1, alert_below=None, alert_above=None) -> KPIResult:
    delta = (val_t0 - val_t1) / abs(val_t1) if val_t1 != 0 else 0
    trend = Trend.UP if delta > 0.05 else Trend.DOWN if delta < -0.05 else Trend.STABLE

    alert = False
    alert_msg = None
    if alert_below and val_t0 < alert_below:
        alert = True
        alert_msg = f"{nome} ({val_t0:.2f}) sotto soglia minima ({alert_below})"
    if alert_above and val_t0 > alert_above:
        alert = True
        alert_msg = f"{nome} ({val_t0:.2f}) sopra soglia massima ({alert_above})"
    if abs(delta) > 0.20:
        alert = True
        alert_msg = (alert_msg or "") + f" | Variazione significativa: {delta:+.1%}"

    return KPIResult(
        nome=nome, formula=formula,
        valore_t0=round(val_t0, 4), valore_t1=round(val_t1, 4),
        delta_pct=round(delta, 4), trend=trend,
        alert=alert, soglia_alert=alert_below or alert_above,
        alert_message=alert_msg,
    )
```

### Risk scorer (ML)

```python
# modules/m3_kpi_bilancio/src/risk_scorer.py
import xgboost as xgb
import shap

class M3RiskScorer:
    """
    XGBoost model that takes KPI values as features and produces a risk score 0-1.
    For prototype: train on synthetic data. For production: train on historical defaults.
    """
    FEATURES = [
        "ebitda_margin", "roe", "roa", "leverage", "current_ratio",
        "interest_coverage", "nfp_ebitda", "dso", "dpo",
        "ebitda_margin_delta", "leverage_delta", "current_ratio_delta",
    ]

    def __init__(self, model_path: str = None):
        if model_path and os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.model = self._default_model()
        self.explainer = shap.TreeExplainer(self.model)

    def score(self, kpis: list[KPIResult]) -> tuple[float, dict]:
        features = self._kpis_to_features(kpis)
        score = float(self.model.predict_proba(features)[0][1])  # prob of "risky"
        xai = self._explain(features)
        return score, xai

    def _explain(self, features) -> dict:
        shap_values = self.explainer.shap_values(features)
        # Format for output
        return {
            "shap_values": shap_values.tolist(),
            "base_value": float(self.explainer.expected_value[1]),
            "feature_importance": sorted([
                {"feature": name, "value": float(features[0][i]),
                 "impact": float(shap_values[0][i]),
                 "direction": "positive" if shap_values[0][i] > 0 else "negative"}
                for i, name in enumerate(self.FEATURES)
            ], key=lambda x: abs(x["impact"]), reverse=True)
        }

    def _default_model(self):
        """Rule-based fallback for prototype before training"""
        # Simple heuristic model — replace with trained XGBoost
        return SimpleRiskModel()
```

---

## M5 — Analisi CR (12 mesi)

**Type:** Statistical analysis + ML
**Dependencies:** None
**Complexity:** High (time-series analysis)

### Core logic

```python
# modules/m5_analisi_cr/src/processor.py
import numpy as np
from scipy import stats

class M5Processor(ModuleBase):
    def process(self, input_data: M5Input) -> M5Output:
        df = self._to_dataframe(input_data.cr_data)

        # 1. Calculate metrics
        metrics = self._calculate_metrics(df)

        # 2. Anomaly detection
        anomalies = self._detect_anomalies(df)

        # 3. Risk scoring
        risk_score, xai = self.risk_scorer.score(metrics, anomalies)

        # 4. Narrative
        narrative = self._generate_narrative(metrics, anomalies, risk_score)

        return M5Output(
            metriche=metrics,
            anomalie=anomalies,
            risk_score_cr=risk_score,
            risk_level=self._severity(risk_score),
            narrativa=narrative,
            xai=xai,
        )

    def _calculate_metrics(self, df) -> list[CRMetric]:
        metrics = []
        for col in ["utilizzato", "sconfinamento", "sofferenze", "scaduto"]:
            ultimo = df[col].iloc[-1]
            media = df[col].mean()
            delta = (ultimo - media) / media if media != 0 else 0
            severity = Severity.OK
            if col == "sconfinamento" and delta > 0.5: severity = Severity.CRITICAL
            elif col == "sconfinamento" and delta > 0.2: severity = Severity.WARNING
            metrics.append(CRMetric(
                metrica=col, valore_ultimo=ultimo,
                media_12m=media, delta=delta, classificazione=severity,
            ))

        # Utilization ratio
        util = df["utilizzato"] / df["accordato"]
        metrics.append(CRMetric(
            metrica="utilizzo_medio", valore_ultimo=float(util.iloc[-1]),
            media_12m=float(util.mean()),
            delta=float(util.iloc[-1] - util.mean()),
            classificazione=Severity.WARNING if util.iloc[-1] > 0.85 else Severity.OK,
        ))
        return metrics

    def _detect_anomalies(self, df) -> list[CRAnomaly]:
        anomalies = []
        for col in ["sconfinamento", "sofferenze", "scaduto"]:
            z_scores = stats.zscore(df[col].fillna(0))
            for i, z in enumerate(z_scores):
                if abs(z) > 2.0:
                    # Check if transitory (resolved within 60 days / 2 months)
                    resolved = False
                    if i < len(df) - 2:
                        # Check if next 2 months returned to normal
                        resolved = all(abs(z_scores[j]) < 1.0 for j in range(i+1, min(i+3, len(df))))

                    anomalies.append(CRAnomaly(
                        tipo=f"{col}_anomalo",
                        descrizione=f"Valore anomalo di {col} nel mese {df['mese'].iloc[i]}",
                        mese_rilevazione=df["mese"].iloc[i],
                        valore_anomalo=float(df[col].iloc[i]),
                        valore_atteso=float(df[col].mean()),
                        z_score=float(z),
                        transitoria=resolved,
                        evidenza=f"Z-score: {z:.2f}, {'rientrato' if resolved else 'persistente'}",
                    ))
        return anomalies
```

---

## M6 — Cross-Check CR vs Bilancio

**Type:** Deterministic (pure calculation)
**Dependencies:** None
**Complexity:** Low
**Priority:** Build FIRST (Phase 1)

```python
# modules/m6_crosscheck/src/processor.py

class M6Processor(ModuleBase):
    def process(self, input_data: M6Input) -> M6Output:
        bil_total = input_data.debiti_bancari_bilancio["totale"]
        cr_total = input_data.utilizzato_cr["totale"]
        max_val = max(bil_total, cr_total, 1)  # avoid div by zero

        delta_pct = abs(bil_total - cr_total) / max_val * 100
        gap_days = abs((input_data.data_bilancio - input_data.data_cr).days)

        severity = Severity.OK
        if delta_pct > 25: severity = Severity.CRITICAL
        elif delta_pct > 10: severity = Severity.WARNING

        # Possible causes
        causes = []
        if gap_days > 90:
            causes.append(f"Sfasamento temporale significativo ({gap_days} giorni) tra data bilancio e data CR")
        if bil_total > cr_total * 1.1:
            causes.append("Bilancio include debiti non censiti in CR (es. leasing, factoring, obbligazioni)")
        if cr_total > bil_total * 1.1:
            causes.append("Possibili utilizzi post-chiusura bilancio o linee non contabilizzate")

        return M6Output(
            delta_pct_totale=round(delta_pct, 2),
            alert=delta_pct > 10,
            severity=severity,
            gap_temporale_giorni=gap_days,
            possibili_cause=causes,
            raccomandazione=self._recommend(severity, causes),
            dettaglio_per_scadenza=self._detail_by_maturity(input_data),
            narrativa=self._narrative(delta_pct, severity, causes, gap_days),
        )
```

---

## M7 — Forecast DSCR

**Type:** Financial modeling + ML + LLM narrative
**Dependencies:** M3 output, M5 output, (optional) M4 output
**Complexity:** High

### DSCR formula

```
DSCR = (EBITDA proiettato - Tasse - Capex mantenimento) / (Quota capitale annua + Interessi annui)

- DSCR > 1.3 → SUSTAINABLE
- 1.0 < DSCR < 1.3 → BORDERLINE
- DSCR < 1.0 → UNSUSTAINABLE
```

### Scenario parameters

```python
SCENARIOS = {
    "OPTIMISTIC": {"revenue_growth": 0.10, "rate_delta": 0.0, "cost_growth": 0.03},
    "BASE":       {"revenue_growth": 0.00, "rate_delta": 0.005, "cost_growth": 0.02},
    "STRESS":     {"revenue_growth": -0.15, "rate_delta": 0.015, "cost_growth": 0.05},
}
```

### Scenario selection logic

```python
def select_scenario(cr_risk_level: Severity, kpi_trend: Trend, benchmark_position: Position) -> Scenario:
    """
    Auto-select the most appropriate scenario based on evidence:
    - If CR risk is CRITICAL or KPI trend is DOWN → STRESS
    - If CR risk is OK and KPI trend is UP and benchmark is OUTPERFORMER → OPTIMISTIC
    - Otherwise → BASE
    """
    if cr_risk_level == Severity.CRITICAL or kpi_trend == Trend.DOWN:
        return Scenario.STRESS
    if cr_risk_level == Severity.OK and kpi_trend == Trend.UP:
        return Scenario.OPTIMISTIC
    return Scenario.BASE
```

---

## M8 — SWOT Analysis

**Type:** Rule engine + LLM narrative
**Dependencies:** M3, (optional) M4, M5, M2
**Complexity:** Medium

### Mapping rules

```python
# modules/m8_swot/src/mapper.py

def map_to_swot(m3: M3Output, m4: M4Output = None, m5: M5Output = None, m2: M2Output = None) -> dict:
    forze, debolezze, opportunita, minacce = [], [], [], []

    # INTERNAL: from M3 KPIs
    for kpi in m3.kpi:
        if m4:
            benchmark = next((b for b in m4.confronto if b.kpi_nome == kpi.nome), None)
            if benchmark and benchmark.posizione == Position.OUTPERFORMER and kpi.trend != Trend.DOWN:
                forze.append(SWOTItem(
                    item=f"{kpi.nome} superiore alla media di settore",
                    evidenza=f"{kpi.nome}: {kpi.valore_t0:.2f} vs mediana {benchmark.mediana_settore:.2f} (percentile {benchmark.percentile_azienda:.0f}°)",
                    impatto=ImpactLevel.HIGH,
                    source_module="M3+M4",
                ))
            elif benchmark and benchmark.posizione == Position.UNDERPERFORMER:
                debolezze.append(SWOTItem(
                    item=f"{kpi.nome} inferiore alla media di settore",
                    evidenza=f"{kpi.nome}: {kpi.valore_t0:.2f} vs mediana {benchmark.mediana_settore:.2f}",
                    impatto=ImpactLevel.HIGH if kpi.alert else ImpactLevel.MEDIUM,
                    source_module="M3+M4",
                ))
        elif kpi.alert:
            debolezze.append(SWOTItem(
                item=kpi.alert_message or f"{kpi.nome} in alert",
                evidenza=f"{kpi.nome}: {kpi.valore_t0:.2f}",
                impatto=ImpactLevel.HIGH,
                source_module="M3",
            ))

    # INTERNAL: from M5 CR
    if m5:
        if m5.risk_level == Severity.OK:
            forze.append(SWOTItem(item="Comportamento CR regolare", ...))
        if m5.anomalie:
            structural = [a for a in m5.anomalie if not a.transitoria]
            if structural:
                debolezze.append(SWOTItem(item=f"{len(structural)} anomalie CR strutturali", ...))

    # EXTERNAL: from M2 web sentiment
    if m2:
        if m2.sentiment_complessivo == Sentiment.POSITIVE:
            opportunita.append(SWOTItem(item="Reputazione web positiva", ...))
        elif m2.sentiment_complessivo == Sentiment.NEGATIVE:
            minacce.append(SWOTItem(item="Sentiment web negativo", ...))

    # EXTERNAL: macro indicators
    # (populated from macro_indicatori input)

    return {"forze": forze, "debolezze": debolezze, "opportunita": opportunita, "minacce": minacce}
```
