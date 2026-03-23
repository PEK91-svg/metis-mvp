from __future__ import annotations
from shared.module_base import ModuleBase
from shared.schemas.m8 import M8Input, M8Output
from shared.llm.client import LLMClient
from shared.utils.config import load_prompt
from .mapper import map_to_swot


class M8Processor(ModuleBase):
    def __init__(self):
        super().__init__("modules/m8_swot/config.yaml")
        self.llm = LLMClient()
        try:
            self.system_prompt = load_prompt("modules/m8_swot/prompts/system.txt")
            self.user_template = load_prompt("modules/m8_swot/prompts/user.txt")
        except FileNotFoundError:
            self.system_prompt = ""
            self.user_template = ""

    def process(self, input_data: M8Input) -> M8Output:
        # 1. Map module outputs to SWOT (including geo-macro context)
        swot = map_to_swot(
            m3=input_data.kpi_analysis,
            m4=input_data.benchmark,
            m5=input_data.cr_analysis,
            m2=input_data.web_sentiment,
            macro=input_data.macro_indicatori,
            area_geografica=input_data.soggetto.area_geografica,
        )

        # 2. Calculate overall score
        score = self._calc_score(swot)

        # 3. Generate narrative and recommendation
        narrativa = self._generate_narrative(swot, score, input_data)
        raccomandazione = self._generate_recommendation(swot, score)

        return M8Output(
            forze=swot["forze"],
            debolezze=swot["debolezze"],
            opportunita=swot["opportunita"],
            minacce=swot["minacce"],
            score_complessivo=round(score, 4),
            raccomandazione_strategica=raccomandazione,
            narrativa=narrativa,
        )

    def _calc_score(self, swot: dict) -> float:
        weights = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        pos = sum(weights.get(i.impatto.value, 1) for i in swot["forze"] + swot["opportunita"])
        neg = sum(weights.get(i.impatto.value, 1) for i in swot["debolezze"] + swot["minacce"])
        total = pos + neg
        if total == 0:
            return 0.5
        return pos / total

    def _generate_narrative(self, swot, score, input_data) -> str:
        geo = input_data.soggetto.area_geografica
        macro = input_data.macro_indicatori
        parts = [
            f"Analisi SWOT per {input_data.soggetto.ragione_sociale} "
            f"(ATECO: {input_data.soggetto.codice_ateco}, area: {geo})."
        ]

        if score >= 0.6:
            parts.append(f"Il profilo complessivo è POSITIVO (score: {score:.2f}).")
        elif score >= 0.4:
            parts.append(f"Il profilo complessivo è BILANCIATO (score: {score:.2f}).")
        else:
            parts.append(f"Il profilo complessivo presenta CRITICITÀ (score: {score:.2f}).")

        parts.append(f"Forze: {len(swot['forze'])}. Debolezze: {len(swot['debolezze'])}. "
                     f"Opportunità: {len(swot['opportunita'])}. Minacce: {len(swot['minacce'])}.")

        if swot["forze"]:
            parts.append(f"Principale forza: {swot['forze'][0].item}.")
        if swot["debolezze"]:
            parts.append(f"Principale debolezza: {swot['debolezze'][0].item}.")

        # Include geo-macro summary if available
        if macro and macro.pil_regionale is not None:
            parts.append(
                f"Contesto macroeconomico {geo}: PIL regionale {macro.pil_regionale:+.1f}%, "
                f"disoccupazione {macro.tasso_disoccupazione:.1f}%, tassi {macro.tassi_interesse:.2f}%."
            )

        return " ".join(parts)

    def _generate_recommendation(self, swot, score) -> str:
        if score >= 0.6:
            return "Profilo favorevole. Monitoraggio ordinario con revisione semestrale."
        elif score >= 0.4:
            rec = "Profilo bilanciato. Monitoraggio trimestrale consigliato."
            if swot["debolezze"]:
                rec += f" Attenzione a: {swot['debolezze'][0].item}."
            return rec
        else:
            rec = "Profilo critico. Monitoraggio ravvicinato necessario."
            if swot["debolezze"]:
                rec += f" Priorità: {', '.join(d.item for d in swot['debolezze'][:2])}."
            return rec

    def explain(self, input_data, output) -> dict:
        all_items = output.forze + output.debolezze + output.opportunita + output.minacce
        return {
            "method": "rule_traceability",
            "items_by_source": {
                "M3": sum(1 for i in all_items if "M3" in i.source_module),
                "M4": sum(1 for i in all_items if "M4" in i.source_module),
                "M5": sum(1 for i in all_items if "M5" in i.source_module),
                "M2": sum(1 for i in all_items if "M2" in i.source_module),
                "MacroIndicatori": sum(1 for i in all_items if "MacroIndicatori" in i.source_module),
            },
            "score_components": {
                "positive_weight": sum(1 for i in output.forze + output.opportunita),
                "negative_weight": sum(1 for i in output.debolezze + output.minacce),
            },
        }
