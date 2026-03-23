"""Prefect flow orchestrating all 8 ACE modules according to the dependency DAG."""
from __future__ import annotations
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_MACRO_CACHE: dict | None = None


def _load_macro_regionali(area_geografica: str) -> dict:
    global _MACRO_CACHE
    if _MACRO_CACHE is None:
        macro_path = Path("data/istat/macro_regionali.json")
        try:
            with open(macro_path) as f:
                _MACRO_CACHE = json.load(f)
        except FileNotFoundError:
            logger.warning("macro_regionali.json not found, using empty MacroIndicatori")
            _MACRO_CACHE = {}
    return _MACRO_CACHE.get(area_geografica) or _MACRO_CACHE.get("default", {})

# Dependency DAG:
# M1 (standalone) ─────────────────────────┐
# M2 (standalone) ─────────────────────────┤
# M3 (standalone) ──┬── M4 (needs M3) ────┤
#                    ├── M6 (needs M3+M5) ─┤
#                    └── M7 (needs M3+M5) ─┤
# M5 (standalone) ──┤                      │
#                    └── M8 (needs M3,M4,M5,M2) ┘


def run_analysis_flow(request_data: dict) -> dict:
    """
    Execute the full analysis pipeline.
    For prototype: sequential execution with dependency ordering.
    For production: use Prefect @task/@flow decorators for parallel execution.
    """
    from shared.schemas.m3 import M3Input
    from shared.schemas.m5 import M5Input
    from shared.schemas.m1 import M1Input
    from shared.schemas.m2 import M2Input
    from shared.schemas.m4 import M4Input
    from shared.schemas.m6 import M6Input
    from shared.schemas.m7 import M7Input
    from shared.schemas.m8 import M8Input, MacroIndicatori
    from shared.schemas.soggetto import Soggetto

    results = {}
    soggetto_data = request_data.get("soggetto", {})
    soggetto = Soggetto(**soggetto_data)
    moduli = request_data.get("moduli_richiesti", ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"])

    # Phase 1: Independent modules (M1, M2, M3, M5)
    if "M1" in moduli and "commenti" in request_data:
        try:
            from modules.m1_sintesi_pef.src.processor import M1Processor
            processor = M1Processor()
            inp = M1Input(pratica_id=request_data.get("pratica_id", ""), commenti=request_data["commenti"])
            results["M1"] = processor.run(inp)
            logger.info("M1 completed")
        except Exception as e:
            logger.error(f"M1 failed: {e}")
            results["M1"] = {"success": False, "error": str(e)}

    if "M2" in moduli:
        try:
            from modules.m2_web_sentiment.src.processor import M2Processor
            processor = M2Processor()
            inp = M2Input(soggetto=soggetto, soggetti_correlati=request_data.get("soggetti_correlati", []))
            results["M2"] = processor.run(inp)
            logger.info("M2 completed")
        except Exception as e:
            logger.error(f"M2 failed: {e}")
            results["M2"] = {"success": False, "error": str(e)}

    if "M3" in moduli and "bilancio_t0" in request_data:
        try:
            from modules.m3_kpi_bilancio.src.processor import M3Processor
            processor = M3Processor()
            inp = M3Input(
                soggetto=soggetto,
                bilancio_t0=request_data["bilancio_t0"],
                bilancio_t1=request_data["bilancio_t1"],
                anno_t0=request_data.get("anno_t0", 2025),
                anno_t1=request_data.get("anno_t1", 2024),
            )
            results["M3"] = processor.run(inp)
            logger.info("M3 completed")
        except Exception as e:
            logger.error(f"M3 failed: {e}")
            results["M3"] = {"success": False, "error": str(e)}

    if "M5" in moduli and "cr_data" in request_data:
        try:
            from modules.m5_analisi_cr.src.processor import M5Processor
            processor = M5Processor()
            inp = M5Input(soggetto=soggetto, cr_data=request_data["cr_data"])
            results["M5"] = processor.run(inp)
            logger.info("M5 completed")
        except Exception as e:
            logger.error(f"M5 failed: {e}")
            results["M5"] = {"success": False, "error": str(e)}

    # Phase 2: Dependent modules (M4, M6, M7, M8)
    if "M4" in moduli and "M3" in results:
        try:
            from modules.m4_benchmark_istat.src.processor import M4Processor
            from shared.schemas.m3 import M3Output
            processor = M4Processor()
            m3_result = results["M3"]
            if hasattr(m3_result, 'output') and m3_result.output:
                m3_out = M3Output(**m3_result.output)
                inp = M4Input(
                    kpi_aziendali=m3_out.kpi,
                    codice_ateco=soggetto.codice_ateco,
                    dimensione=soggetto.dimensione,
                    area_geografica=soggetto.area_geografica,
                )
                results["M4"] = processor.run(inp)
                logger.info("M4 completed")
        except Exception as e:
            logger.error(f"M4 failed: {e}")
            results["M4"] = {"success": False, "error": str(e)}

    if "M6" in moduli and "bilancio_t0" in request_data and "cr_data" in request_data:
        try:
            from modules.m6_crosscheck.src.processor import M6Processor
            processor = M6Processor()
            bil = request_data["bilancio_t0"]
            cr_data = request_data["cr_data"]
            cr_last = cr_data[-1] if cr_data else {}
            inp = M6Input(
                debiti_bancari_bilancio={
                    "breve_termine": bil.get("debiti_finanziari_bt", 0),
                    "medio_lungo": bil.get("debiti_finanziari_mlt", 0),
                    "totale": bil.get("debiti_finanziari_bt", 0) + bil.get("debiti_finanziari_mlt", 0),
                },
                utilizzato_cr={
                    "totale": cr_last.get("utilizzato", 0),
                    "per_categoria": [
                        {"cat": "breve_termine", "importo": cr_last.get("utilizzato", 0) * 0.3},
                        {"cat": "medio_lungo", "importo": cr_last.get("utilizzato", 0) * 0.7},
                    ],
                },
                data_bilancio=request_data.get("data_bilancio", "2025-12-31"),
                data_cr=cr_last.get("mese", "2025-12-01"),
            )
            results["M6"] = processor.run(inp)
            logger.info("M6 completed")
        except Exception as e:
            logger.error(f"M6 failed: {e}")
            results["M6"] = {"success": False, "error": str(e)}

    if "M7" in moduli and "M3" in results and "M5" in results:
        try:
            from modules.m7_forecast.src.processor import M7Processor
            from shared.schemas.m3 import M3Output
            from shared.schemas.m5 import M5Output
            processor = M7Processor()
            m3r = results["M3"]
            m5r = results["M5"]
            if hasattr(m3r, 'output') and m3r.output and hasattr(m5r, 'output') and m5r.output:
                m5_out = M5Output(**m5r.output)
                inp = M7Input(
                    bilancio=M3Input(
                        soggetto=soggetto,
                        bilancio_t0=request_data["bilancio_t0"],
                        bilancio_t1=request_data["bilancio_t1"],
                        anno_t0=request_data.get("anno_t0", 2025),
                        anno_t1=request_data.get("anno_t1", 2024),
                    ),
                    cr_analysis=m5_out,
                )
                results["M7"] = processor.run(inp)
                logger.info("M7 completed")
        except Exception as e:
            logger.error(f"M7 failed: {e}")
            results["M7"] = {"success": False, "error": str(e)}

    if "M8" in moduli and "M3" in results:
        try:
            from modules.m8_swot.src.processor import M8Processor
            from shared.schemas.m3 import M3Output
            from shared.schemas.m4 import M4Output
            from shared.schemas.m5 import M5Output
            from shared.schemas.m2 import M2Output
            processor = M8Processor()
            m3r = results["M3"]
            if hasattr(m3r, 'output') and m3r.output:
                m3_out = M3Output(**m3r.output)
                m4_out = M4Output(**results["M4"].output) if "M4" in results and hasattr(results["M4"], 'output') and results["M4"].output else None
                m5_out = M5Output(**results["M5"].output) if "M5" in results and hasattr(results["M5"], 'output') and results["M5"].output else None
                m2_out = M2Output(**results["M2"].output) if "M2" in results and hasattr(results["M2"], 'output') and results["M2"].output else None
                macro_data = _load_macro_regionali(soggetto.area_geografica)
                macro = MacroIndicatori(**macro_data) if macro_data else MacroIndicatori()
                inp = M8Input(
                    kpi_analysis=m3_out,
                    benchmark=m4_out,
                    cr_analysis=m5_out,
                    web_sentiment=m2_out,
                    soggetto=soggetto,
                    macro_indicatori=macro,
                )
                results["M8"] = processor.run(inp)
                logger.info("M8 completed")
        except Exception as e:
            logger.error(f"M8 failed: {e}")
            results["M8"] = {"success": False, "error": str(e)}

    # Serialize results
    serialized = {}
    for k, v in results.items():
        if hasattr(v, 'model_dump'):
            serialized[k] = v.model_dump()
        elif isinstance(v, dict):
            serialized[k] = v
        else:
            serialized[k] = str(v)

    return {
        "pratica_id": request_data.get("pratica_id", ""),
        "soggetto": soggetto_data,
        "status": "COMPLETED",
        "modules_completed": [k for k, v in results.items() if hasattr(v, 'success') and v.success],
        "modules_failed": [k for k, v in results.items() if hasattr(v, 'success') and not v.success],
        "module_results": serialized,
    }
