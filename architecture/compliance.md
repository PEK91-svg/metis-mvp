# EU AI Act Compliance — Implementation Guide

## Classification

Credit scoring systems = **HIGH RISK** (Annex III, 5b).
This means ALL of the following are MANDATORY, not optional.

## Requirements checklist per module

### Art. 9 — Risk Management System

**What to implement:**
- `shared/risk/monitor.py` — Monitors all module executions for anomalies
- Every module MUST log: input data quality score, output confidence, latency
- Automatic escalation if:
  - Model confidence < configurable threshold (default 0.6)
  - Data quality score < 70/100
  - Latency exceeds 3x SLA
  - Output falls outside expected distribution (PSI check)

```python
# shared/risk/monitor.py
class RiskMonitor:
    def check_execution(self, module_code: str, result: ModuleResult) -> list[RiskAlert]:
        alerts = []
        if result.latency_ms > self.sla[module_code] * 3:
            alerts.append(RiskAlert(level="WARNING", msg=f"Latency {result.latency_ms}ms exceeds 3x SLA"))
        if result.output and result.output.get("confidence", 1.0) < 0.6:
            alerts.append(RiskAlert(level="CRITICAL", msg="Low confidence score"))
        return alerts
```

**Applies to:** All modules (M1-M8)

### Art. 10 — Data Governance

**What to implement:**
- `shared/data/quality.py` — Data quality scorer
- `shared/data/lineage.py` — Tracks data from source to output
- Bias detection in training data for ML modules

```python
# shared/data/quality.py
class DataQualityScorer:
    def score(self, data: dict, schema: type[BaseModel]) -> DataQualityReport:
        """
        Checks:
        - completeness: % of non-null required fields
        - freshness: days since data reference date
        - consistency: cross-field validation rules
        - accuracy: range checks, format validation
        Returns score 0-100 and detailed breakdown
        """
        completeness = self._check_completeness(data, schema)
        freshness = self._check_freshness(data)
        consistency = self._check_consistency(data)
        return DataQualityReport(
            overall_score=weighted_avg([completeness, freshness, consistency]),
            details={...}
        )
```

**Applies to:** M3, M4, M5, M7 (all modules with quantitative input)

### Art. 12 — Record-Keeping (Audit Trail)

**What to implement:**
- `shared/audit/logger.py` — Immutable audit trail
- Every single execution of every module → audit record
- Every human action (confirm/override/escalate) → audit record

```python
# shared/audit/logger.py
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import hashlib, json

class ActionType(str, Enum):
    MODULE_EXECUTED = "MODULE_EXECUTED"
    HUMAN_CONFIRMED = "HUMAN_CONFIRMED"
    HUMAN_OVERRIDDEN = "HUMAN_OVERRIDDEN"
    HUMAN_ESCALATED = "HUMAN_ESCALATED"
    DATA_FETCHED = "DATA_FETCHED"
    REPORT_GENERATED = "REPORT_GENERATED"

@dataclass
class AuditRecord:
    execution_id: str        # UUID
    job_id: str              # pratica job UUID
    module_code: str | None  # M1-M8 or None for system actions
    action_type: ActionType
    actor: str               # "SYSTEM" or user_id
    input_hash: str          # SHA-256 of input
    output_hash: str         # SHA-256 of output
    override_reason: str | None
    timestamp: datetime
    metadata: dict           # model_version, latency_ms, etc.

class AuditLogger:
    def __init__(self, db_session):
        self.db = db_session

    def log(self, record: AuditRecord) -> None:
        """Write audit record. APPEND ONLY — never update or delete."""
        self.db.execute(INSERT_SQL, record.__dict__)
        self.db.commit()

    @staticmethod
    def hash_data(data: dict) -> str:
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
```

**CRITICAL:** Audit records are APPEND-ONLY. No UPDATE, no DELETE. Retention: 5 years minimum.

**Applies to:** All modules, all human actions, all system events

### Art. 13 — Transparency (XAI)

**What to implement:**
- `shared/xai/shap_explainer.py` — SHAP wrapper for ML models
- `shared/xai/source_attribution.py` — For LLM-generated text
- `shared/xai/formatter.py` — Formats explanations for report

```python
# shared/xai/shap_explainer.py
import shap
import numpy as np

class ShapExplainer:
    def __init__(self, model, model_type: str = "tree"):
        if model_type == "tree":
            self.explainer = shap.TreeExplainer(model)
        else:
            self.explainer = shap.KernelExplainer(model.predict, background_data)

    def explain(self, input_features: np.ndarray, feature_names: list[str]) -> dict:
        """
        Returns:
        {
            "shap_values": [[0.12, -0.05, 0.34, ...]],
            "base_value": 0.45,
            "feature_importance": [
                {"feature": "ebitda_margin", "value": 0.08, "impact": 0.34, "direction": "positive"},
                {"feature": "leverage", "value": 5.2, "impact": -0.28, "direction": "negative"},
                ...
            ],
            "narrative": "Il risk score è 0.72 (rischio medio-alto). I fattori principali sono: ..."
        }
        """
        shap_values = self.explainer.shap_values(input_features)
        base_value = self.explainer.expected_value

        # Sort by absolute impact
        importance = sorted(
            zip(feature_names, input_features[0], shap_values[0]),
            key=lambda x: abs(x[2]),
            reverse=True
        )

        return {
            "shap_values": shap_values.tolist(),
            "base_value": float(base_value),
            "feature_importance": [
                {
                    "feature": name,
                    "value": float(val),
                    "impact": float(shap_val),
                    "direction": "positive" if shap_val > 0 else "negative"
                }
                for name, val, shap_val in importance[:10]
            ]
        }
```

**For LLM modules (M1, M2, M8):**

```python
# shared/xai/source_attribution.py
class SourceAttribution:
    """
    For every statement in the LLM output, identify which input text it came from.
    Uses embedding similarity between output sentences and input sentences.
    """
    def attribute(self, output_text: str, input_texts: list[str]) -> list[Attribution]:
        output_sentences = split_sentences(output_text)
        input_sentences = flatten([split_sentences(t) for t in input_texts])

        attributions = []
        for out_sent in output_sentences:
            similarities = compute_similarities(out_sent, input_sentences)
            best_match = max(similarities, key=lambda x: x.score)
            attributions.append(Attribution(
                output_sentence=out_sent,
                source_sentence=best_match.text,
                confidence=best_match.score
            ))
        return attributions
```

**Applies to:** M1, M2, M3, M5, M7, M8

### Art. 14 — Human Oversight

**What to implement:**
- Dashboard with CONFIRM / OVERRIDE / ESCALATE buttons
- Override requires mandatory text reason
- ESCALATE sends notification to senior analyst
- **NO automated credit decisions** — ACE only suggests, human decides

```python
# api/routes/review.py
class ReviewAction(str, Enum):
    CONFIRMED = "CONFIRMED"
    OVERRIDDEN = "OVERRIDDEN"
    ESCALATED = "ESCALATED"

class ReviewRequest(BaseModel):
    job_id: str
    module_code: str | None = None  # None = overall review
    action: ReviewAction
    reason: str | None = None       # MANDATORY if OVERRIDDEN

    @validator("reason")
    def reason_required_for_override(cls, v, values):
        if values.get("action") == ReviewAction.OVERRIDDEN and not v:
            raise ValueError("Override reason is mandatory")
        return v
```

**EVERY screen in the dashboard must display:**
> ⚠️ Questo output è generato da un sistema AI e richiede validazione umana prima dell'utilizzo nel processo decisionale.

**Applies to:** All modules, dashboard, report

### Art. 15 — Accuracy & Robustness

**What to implement:**
- `tests/` — Comprehensive test suite
- Model monitoring in production (AuROC, PSI, latency)
- Automatic rollback if metrics degrade

```python
# shared/monitoring/model_monitor.py
class ModelMonitor:
    def check_drift(self, predictions: list[float], reference: list[float]) -> DriftReport:
        """Calculate PSI between current and reference distributions"""
        psi = calculate_psi(predictions, reference)
        return DriftReport(
            psi=psi,
            drifted=psi > 0.2,  # PSI > 0.2 = significant drift
            action="ROLLBACK" if psi > 0.25 else "RETRAIN" if psi > 0.2 else "OK"
        )
```

**Applies to:** M3, M5, M7 (ML-based modules)

## Summary: what every module MUST have

```python
class ModuleContract:
    """Every module must implement this"""

    # 1. Defined input/output schemas (Pydantic)
    input_schema: type[BaseModel]
    output_schema: type[BaseModel]

    # 2. XAI explanation for every execution
    def explain(self, input, output) -> XAIExplanation: ...

    # 3. Audit logging
    def log_execution(self, input, output, latency) -> AuditRecord: ...

    # 4. Data quality validation
    def validate_input(self, input) -> DataQualityReport: ...

    # 5. Graceful error handling
    def handle_error(self, error) -> ModuleResult: ...

    # 6. Configuration via YAML
    config: ModuleConfig

    # 7. Disclaimer in output
    DISCLAIMER = "Output generato da sistema AI - richiede validazione umana"
```
