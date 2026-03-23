import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.schemas.m3 import M3Output, KPIResult
from shared.schemas.m4 import M4Output, BenchmarkKPI
from shared.schemas.m5 import M5Output, CRMetric
from shared.schemas.m8 import M8Input, MacroIndicatori
from shared.schemas.soggetto import Soggetto
from shared.schemas.common import Severity, Trend, Position, ImpactLevel
from modules.m8_swot.src.mapper import map_to_swot
from modules.m8_swot.src.processor import M8Processor


def make_soggetto():
    return Soggetto(
        ragione_sociale="Test S.r.l.", codice_fiscale="12345678901",
        partita_iva="12345678901", codice_ateco="28.11",
        dimensione="piccola", provincia="MI", area_geografica="Nord-Ovest",
    )

def make_m3_output(alerts=False):
    kpis = [
        KPIResult(nome="EBITDA Margin", formula="EBITDA/R", valore_t0=0.12, valore_t1=0.10, delta_pct=0.2, trend=Trend.UP, alert=alerts),
        KPIResult(nome="Leverage (D/E)", formula="D/E", valore_t0=2.0, valore_t1=2.5, delta_pct=-0.2, trend=Trend.DOWN, alert=alerts, alert_message="Leverage alto" if alerts else None),
    ]
    return M3Output(kpi=kpis, risk_score=0.4, risk_level=Severity.WARNING, narrativa="Test", xai={})

def make_m4_output():
    return M4Output(
        confronto=[
            BenchmarkKPI(kpi_nome="EBITDA Margin", valore_azienda=0.12, mediana_settore=0.10, percentile_25=0.05, percentile_75=0.15, percentile_azienda=65, posizione=Position.OUTPERFORMER),
            BenchmarkKPI(kpi_nome="Leverage (D/E)", valore_azienda=2.0, mediana_settore=2.5, percentile_25=1.5, percentile_75=4.0, percentile_azienda=40, posizione=Position.INLINE),
        ],
        posizione_complessiva=Position.INLINE, punti_forza=[], punti_debolezza=[],
        narrativa="Test", dataset_anno=2024,
    )

def make_m5_output(risk_level=Severity.OK):
    return M5Output(
        metriche=[CRMetric(metrica="utilizzato", valore_ultimo=1100000, media_12m=1100000, delta=0, classificazione=Severity.OK)],
        anomalie=[], risk_score_cr=0.3, risk_level=risk_level, narrativa="OK", xai={},
    )


class TestSWOTMapper:
    def test_strengths_from_outperformer(self):
        m3 = make_m3_output()
        m4 = make_m4_output()
        swot = map_to_swot(m3, m4)
        assert len(swot["forze"]) > 0

    def test_weakness_from_alerts(self):
        m3 = make_m3_output(alerts=True)
        swot = map_to_swot(m3)
        assert len(swot["debolezze"]) > 0

    def test_cr_strength(self):
        m3 = make_m3_output()
        m5 = make_m5_output(Severity.OK)
        swot = map_to_swot(m3, m5=m5)
        cr_forze = [f for f in swot["forze"] if f.source_module == "M5"]
        assert len(cr_forze) > 0


class TestM8Processor:
    def test_returns_swot(self):
        processor = M8Processor()
        inp = M8Input(
            kpi_analysis=make_m3_output(),
            benchmark=make_m4_output(),
            cr_analysis=make_m5_output(),
            soggetto=make_soggetto(),
        )
        result = processor.process(inp)
        assert 0 <= result.score_complessivo <= 1

    def test_narrative_not_empty(self):
        processor = M8Processor()
        inp = M8Input(kpi_analysis=make_m3_output(), soggetto=make_soggetto())
        result = processor.process(inp)
        assert len(result.narrativa) > 30

    def test_recommendation(self):
        processor = M8Processor()
        inp = M8Input(kpi_analysis=make_m3_output(), soggetto=make_soggetto())
        result = processor.process(inp)
        assert len(result.raccomandazione_strategica) > 10

    def test_narrative_includes_geo(self):
        processor = M8Processor()
        macro = MacroIndicatori(pil_regionale=1.8, tasso_disoccupazione=5.2, indice_produzione_settore=2.1, inflazione=2.4, tassi_interesse=3.75)
        inp = M8Input(kpi_analysis=make_m3_output(), soggetto=make_soggetto(), macro_indicatori=macro)
        result = processor.process(inp)
        assert "Nord-Ovest" in result.narrativa


class TestSWOTMapperGeo:
    def test_nord_ovest_generates_opportunita(self):
        m3 = make_m3_output()
        macro = MacroIndicatori(pil_regionale=1.8, tasso_disoccupazione=5.2, indice_produzione_settore=2.1, inflazione=2.4, tassi_interesse=3.75)
        swot = map_to_swot(m3, macro=macro, area_geografica="Nord-Ovest")
        geo_items = [o for o in swot["opportunita"] if o.source_module == "MacroIndicatori"]
        assert len(geo_items) >= 2
        descriptions = " ".join(o.item for o in geo_items)
        assert "Nord-Ovest" in descriptions

    def test_sud_generates_minacce(self):
        m3 = make_m3_output()
        macro = MacroIndicatori(pil_regionale=0.4, tasso_disoccupazione=16.8, indice_produzione_settore=0.3, inflazione=2.6, tassi_interesse=3.75)
        swot = map_to_swot(m3, macro=macro, area_geografica="Sud")
        geo_minacce = [m for m in swot["minacce"] if m.source_module == "MacroIndicatori"]
        assert len(geo_minacce) >= 2
        descriptions = " ".join(m.item for m in geo_minacce)
        assert "Sud" in descriptions

    def test_fallback_no_macro_unchanged(self):
        m3 = make_m3_output()
        swot_no_macro = map_to_swot(m3)
        swot_empty_macro = map_to_swot(m3, macro=MacroIndicatori())
        assert len(swot_no_macro["opportunita"]) == len(swot_empty_macro["opportunita"])
        assert len(swot_no_macro["minacce"]) == len(swot_empty_macro["minacce"])

    def test_high_rates_generates_minaccia(self):
        m3 = make_m3_output()
        macro = MacroIndicatori(tassi_interesse=4.5, inflazione=2.0, pil_regionale=1.0, tasso_disoccupazione=6.0, indice_produzione_settore=1.0)
        swot = map_to_swot(m3, macro=macro)
        rate_minacce = [m for m in swot["minacce"] if "tassi" in m.item.lower()]
        assert len(rate_minacce) == 1
