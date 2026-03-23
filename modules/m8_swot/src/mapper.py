from __future__ import annotations
from shared.schemas.m8 import SWOTItem, MacroIndicatori
from shared.schemas.m3 import M3Output
from shared.schemas.m4 import M4Output
from shared.schemas.m5 import M5Output
from shared.schemas.m2 import M2Output
from shared.schemas.common import Position, Severity, Sentiment, ImpactLevel, Trend


def map_to_swot(
    m3: M3Output,
    m4: M4Output | None = None,
    m5: M5Output | None = None,
    m2: M2Output | None = None,
    macro: MacroIndicatori | None = None,
    area_geografica: str | None = None,
) -> dict:
    forze = []
    debolezze = []
    opportunita = []
    minacce = []

    # INTERNAL: from M3 KPIs + M4 benchmarks
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

    # Trend-based strengths
    improving = [k for k in m3.kpi if k.trend == Trend.UP and not k.alert]
    if improving:
        forze.append(SWOTItem(
            item=f"{len(improving)} KPI in miglioramento",
            evidenza=", ".join(f"{k.nome} ({k.delta_pct:+.1%})" for k in improving[:3]),
            impatto=ImpactLevel.MEDIUM,
            source_module="M3",
        ))

    declining = [k for k in m3.kpi if k.trend == Trend.DOWN]
    if declining:
        debolezze.append(SWOTItem(
            item=f"{len(declining)} KPI in peggioramento",
            evidenza=", ".join(f"{k.nome} ({k.delta_pct:+.1%})" for k in declining[:3]),
            impatto=ImpactLevel.MEDIUM,
            source_module="M3",
        ))

    # INTERNAL: from M5 CR
    if m5:
        if m5.risk_level == Severity.OK:
            forze.append(SWOTItem(
                item="Comportamento CR regolare",
                evidenza=f"Risk score CR: {m5.risk_score_cr:.2f}, nessuna anomalia strutturale",
                impatto=ImpactLevel.HIGH,
                source_module="M5",
            ))
        if m5.anomalie:
            structural = [a for a in m5.anomalie if not a.transitoria]
            if structural:
                debolezze.append(SWOTItem(
                    item=f"{len(structural)} anomalie CR strutturali",
                    evidenza="; ".join(a.descrizione for a in structural[:3]),
                    impatto=ImpactLevel.HIGH,
                    source_module="M5",
                ))
        if m5.risk_level == Severity.CRITICAL:
            minacce.append(SWOTItem(
                item="Rischio CR critico",
                evidenza=f"Risk score CR: {m5.risk_score_cr:.2f}",
                impatto=ImpactLevel.HIGH,
                source_module="M5",
            ))

    # EXTERNAL: from M2 web sentiment
    if m2:
        if m2.sentiment_complessivo == Sentiment.POSITIVE:
            opportunita.append(SWOTItem(
                item="Reputazione web positiva",
                evidenza=f"Sentiment score: {m2.sentiment_score:.2f}, {len(m2.fonti)} fonti analizzate",
                impatto=ImpactLevel.MEDIUM,
                source_module="M2",
            ))
        elif m2.sentiment_complessivo == Sentiment.NEGATIVE:
            minacce.append(SWOTItem(
                item="Sentiment web negativo",
                evidenza=f"Sentiment score: {m2.sentiment_score:.2f}, {len(m2.fonti)} fonti analizzate",
                impatto=ImpactLevel.MEDIUM,
                source_module="M2",
            ))

    # EXTERNAL: geo-macro context
    if macro:
        _apply_macro_opportunita(macro, area_geografica, opportunita)
        _apply_macro_minacce(macro, area_geografica, minacce)

    return {
        "forze": forze,
        "debolezze": debolezze,
        "opportunita": opportunita,
        "minacce": minacce,
    }


def _apply_macro_opportunita(macro: MacroIndicatori, area: str | None, opportunita: list) -> None:
    geo_label = f" ({area})" if area else ""

    if macro.pil_regionale is not None and macro.pil_regionale > 1.5:
        opportunita.append(SWOTItem(
            item=f"Contesto regionale in espansione{geo_label}",
            evidenza=f"PIL regionale: +{macro.pil_regionale:.1f}% — dinamica territoriale favorevole alla crescita del fatturato",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))

    if macro.indice_produzione_settore is not None and macro.indice_produzione_settore > 1.0:
        opportunita.append(SWOTItem(
            item="Settore in crescita a livello nazionale",
            evidenza=f"Indice produzione settoriale: +{macro.indice_produzione_settore:.1f}% — domanda strutturale in aumento",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))

    if macro.tasso_disoccupazione is not None and macro.tasso_disoccupazione < 6.0:
        opportunita.append(SWOTItem(
            item=f"Mercato del lavoro locale favorevole{geo_label}",
            evidenza=f"Tasso di disoccupazione: {macro.tasso_disoccupazione:.1f}% — disponibilità di forza lavoro qualificata",
            impatto=ImpactLevel.LOW,
            source_module="MacroIndicatori",
        ))

    if macro.tassi_interesse is not None and macro.tassi_interesse < 3.0:
        opportunita.append(SWOTItem(
            item="Contesto tassi favorevole al finanziamento",
            evidenza=f"Tassi BCE: {macro.tassi_interesse:.2f}% — costo del debito contenuto",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))


def _apply_macro_minacce(macro: MacroIndicatori, area: str | None, minacce: list) -> None:
    geo_label = f" ({area})" if area else ""

    if macro.tassi_interesse is not None and macro.tassi_interesse > 4.0:
        minacce.append(SWOTItem(
            item="Pressione da tassi elevati sul servizio del debito",
            evidenza=f"Tassi BCE: {macro.tassi_interesse:.2f}% — incremento oneri finanziari su debito a tasso variabile",
            impatto=ImpactLevel.HIGH,
            source_module="MacroIndicatori",
        ))

    if macro.inflazione is not None and macro.inflazione > 3.5:
        minacce.append(SWOTItem(
            item="Erosione dei margini da inflazione",
            evidenza=f"Inflazione: {macro.inflazione:.1f}% — pressione al rialzo su costi operativi e materie prime",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))

    if macro.tasso_disoccupazione is not None and macro.tasso_disoccupazione > 10.0:
        minacce.append(SWOTItem(
            item=f"Contrazione della domanda locale{geo_label}",
            evidenza=f"Tasso di disoccupazione: {macro.tasso_disoccupazione:.1f}% — riduzione del potere d'acquisto nel territorio di riferimento",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))

    if macro.pil_regionale is not None and macro.pil_regionale < 0.5:
        minacce.append(SWOTItem(
            item=f"Rallentamento economico regionale{geo_label}",
            evidenza=f"PIL regionale: +{macro.pil_regionale:.1f}% — contesto territoriale di crescita debole",
            impatto=ImpactLevel.MEDIUM,
            source_module="MacroIndicatori",
        ))
