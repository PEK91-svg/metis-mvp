from __future__ import annotations
import json
from pathlib import Path
from shared.module_base import ModuleBase
from shared.schemas.m4 import M4Input, M4Output, BenchmarkKPI
from shared.schemas.common import Position


class M4Processor(ModuleBase):
    def __init__(self):
        super().__init__("modules/m4_benchmark_istat/config.yaml")
        benchmark_path = self.config.get("data", {}).get(
            "benchmark_file", "modules/m4_benchmark_istat/data/istat_benchmarks.json"
        )
        self.benchmarks = self._load_benchmarks(benchmark_path)

    def _load_benchmarks(self, path: str) -> dict:
        try:
            with open(Path(path)) as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def process(self, input_data: M4Input) -> M4Output:
        sector_key = input_data.codice_ateco[:2]
        # Try geo-specific benchmark first (e.g. "28_Nord-Ovest"), fallback to national
        geo_key = f"{sector_key}_{input_data.area_geografica.replace(' ', '-')}"
        sector_data = self.benchmarks.get(geo_key) or self.benchmarks.get(sector_key) or self.benchmarks.get("default", {})

        confronto = []
        punti_forza = []
        punti_debolezza = []

        for kpi in input_data.kpi_aziendali:
            bench = sector_data.get(kpi.nome, {})
            if not bench:
                continue

            mediana = bench.get("mediana", 0)
            p25 = bench.get("p25", 0)
            p75 = bench.get("p75", 0)
            higher_is_better = bench.get("higher_is_better", True)

            percentile = self._calc_percentile(kpi.valore_t0, p25, mediana, p75)
            posizione = self._determine_position(percentile, higher_is_better)

            confronto.append(BenchmarkKPI(
                kpi_nome=kpi.nome,
                valore_azienda=kpi.valore_t0,
                mediana_settore=mediana,
                percentile_25=p25,
                percentile_75=p75,
                percentile_azienda=round(percentile, 1),
                posizione=posizione,
            ))

            if posizione == Position.OUTPERFORMER:
                punti_forza.append(f"{kpi.nome}: {kpi.valore_t0:.2f} vs mediana settore {mediana:.2f}")
            elif posizione == Position.UNDERPERFORMER:
                punti_debolezza.append(f"{kpi.nome}: {kpi.valore_t0:.2f} vs mediana settore {mediana:.2f}")

        posizione_complessiva = self._overall_position(confronto)
        narrativa = self._generate_narrative(confronto, punti_forza, punti_debolezza, posizione_complessiva, input_data)

        return M4Output(
            confronto=confronto,
            posizione_complessiva=posizione_complessiva,
            punti_forza=punti_forza,
            punti_debolezza=punti_debolezza,
            narrativa=narrativa,
            dataset_anno=self.config.get("data", {}).get("dataset_anno", 2024),
        )

    def _calc_percentile(self, value: float, p25: float, mediana: float, p75: float) -> float:
        if p75 == p25:
            return 50.0
        if value <= p25:
            return max(0, 25 * value / p25) if p25 != 0 else 10.0
        elif value <= mediana:
            return 25 + 25 * (value - p25) / (mediana - p25) if mediana != p25 else 37.5
        elif value <= p75:
            return 50 + 25 * (value - mediana) / (p75 - mediana) if p75 != mediana else 62.5
        else:
            return min(99, 75 + 25 * (value - p75) / (p75 - mediana)) if p75 != mediana else 90.0

    def _determine_position(self, percentile: float, higher_is_better: bool) -> Position:
        if higher_is_better:
            if percentile >= 65:
                return Position.OUTPERFORMER
            elif percentile <= 35:
                return Position.UNDERPERFORMER
            return Position.INLINE
        else:
            if percentile <= 35:
                return Position.OUTPERFORMER
            elif percentile >= 65:
                return Position.UNDERPERFORMER
            return Position.INLINE

    def _overall_position(self, confronto: list[BenchmarkKPI]) -> Position:
        if not confronto:
            return Position.INLINE
        scores = {"OUTPERFORMER": 0, "INLINE": 0, "UNDERPERFORMER": 0}
        for b in confronto:
            scores[b.posizione.value] += 1
        if scores["OUTPERFORMER"] > scores["UNDERPERFORMER"]:
            return Position.OUTPERFORMER
        elif scores["UNDERPERFORMER"] > scores["OUTPERFORMER"]:
            return Position.UNDERPERFORMER
        return Position.INLINE

    def _generate_narrative(self, confronto, punti_forza, punti_debolezza, posizione, input_data) -> str:
        parts = [f"Benchmarking settoriale per codice ATECO {input_data.codice_ateco} ({input_data.dimensione}, {input_data.area_geografica})."]
        parts.append(f"Posizione complessiva: {posizione.value}.")
        if punti_forza:
            parts.append(f"Punti di forza ({len(punti_forza)}): {'; '.join(punti_forza[:3])}.")
        if punti_debolezza:
            parts.append(f"Punti di debolezza ({len(punti_debolezza)}): {'; '.join(punti_debolezza[:3])}.")
        if not punti_forza and not punti_debolezza:
            parts.append("L'azienda si posiziona in linea con la mediana di settore per tutti gli indicatori analizzati.")
        return " ".join(parts)

    def explain(self, input_data, output) -> dict:
        return {
            "method": "deterministic_benchmark",
            "dataset_anno": output.dataset_anno,
            "kpis_confrontati": len(output.confronto),
        }
