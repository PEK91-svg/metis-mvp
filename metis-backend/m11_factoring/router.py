from fastapi import APIRouter
from datetime import date
from .schemas import M11Input, M11Output, RischioConcentrazione, RischioDiluizione, DsoPortfolio
from .metrics import calcola_concentrazione_hhi, calcola_rischio_diluizione, calcola_dso_portfolio
from .risk_scorer import FactoringRiskScorer
from .xai_agent import FactoringXAIAgent

router = APIRouter(
    prefix="/api/v1/modules/m11",
    tags=["M11 - Analisi Portafoglio Factoring"]
)

@router.post("/analyze-portfolio", response_model=M11Output, summary="Analizza un portafoglio fatture (Factoring)")
async def analyze_portfolio(data: M11Input):
    """
    Carica ed elabora un portafoglio fatture (Factoring).
    Calcola:
    - Rischi di Concentrazione (HHI e Incidenza top debtor)
    - Rischi di Diluizione (Tasso storico note di credito)
    - Qualità del credito (DSO medio ponderato, % scaduto)
    - Score globale e Rating del portafoglio
    - Sub-limits suggeriti e Narrativa Explainable AI
    """
    oggi = date.today()
    
    # 1. Calcolo metriche matematiche
    concentrazione = calcola_concentrazione_hhi(data.portafoglio_fatture)
    diluizione = calcola_rischio_diluizione(data.storico_resi)
    dso = calcola_dso_portfolio(data.portafoglio_fatture, oggi)
    
    # 2. Risk Scoring globale
    scorer = FactoringRiskScorer()
    score_val, rating_val = scorer.generate_score(data, concentrazione, diluizione, dso)
    sublimits = scorer.calcola_sublimits(data, concentrazione)
    
    # 3. Generazione Narrativa XAI
    xai_agent = FactoringXAIAgent()
    context = {
        'score': score_val,
        'rating': rating_val,
        'hhi': concentrazione.hhi_index,
        'alert_hhi': concentrazione.alert,
        'top_ceduto': concentrazione.ceduto_top_1_piva,
        'top_pct': concentrazione.ceduto_top_1_pct,
        'dso': dso.dso_medio_ponderato,
        'scaduto_pct': dso.pct_scaduto_su_totale,
        'diluizione_pct': diluizione.tasso_storico_pct,
        'alert_dil': diluizione.alert,
        'anticipo_suggerito': diluizione.impatto_su_anticipo_suggerito
    }
    narrativa = xai_agent.generate_narrative(context)
    
    valore_tot = sum(f.importo for f in data.portafoglio_fatture)
    
    return M11Output(
        id_pratica=data.id_pratica,
        score_globale=score_val,
        rating_portafoglio=rating_val,
        valore_totale_portafoglio=valore_tot,
        concentrazione=concentrazione,
        diluizione=diluizione,
        dso_metrica=dso,
        raccomandazione_xai=narrativa,
        sublimits_suggeriti=sublimits
    )
