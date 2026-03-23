from typing import List, Dict, Tuple
from datetime import date
from collections import defaultdict
from .schemas import M11Input, Fattura, RischioConcentrazione, RischioDiluizione, DsoPortfolio

def calcola_concentrazione_hhi(portafoglio: List[Fattura]) -> RischioConcentrazione:
    """
    Calcola l'indice HHI (Herfindahl-Hirschman) basato sulle quote % dei debitori
    HHI < 1500: Molto frammentato (Rischio basso)
    1500 < HHI < 2500: Moderata concentrazione
    HHI > 2500: Alta concentrazione (Rischio alto)
    HHI = 10000: Un solo debitore
    """
    if not portafoglio:
        return RischioConcentrazione(hhi_index=0, ceduto_top_1_piva="", ceduto_top_1_pct=0, alert=False)

    totale_portafoglio = sum(f.importo for f in portafoglio)
    esposizione_ceduti: Dict[str, float] = defaultdict(float)
    
    for f in portafoglio:
        esposizione_ceduti[f.ceduto_piva] += f.importo
        
    hhi = 0.0
    top_piva = ""
    top_pct = 0.0
    
    for piva, amount in esposizione_ceduti.items():
        pct = (amount / totale_portafoglio) * 100
        hhi += pct ** 2
        if pct > top_pct:
            top_pct = pct
            top_piva = piva

    alert = hhi > 2500 or top_pct > 25.0

    return RischioConcentrazione(
        hhi_index=round(hhi, 2),
        ceduto_top_1_piva=top_piva,
        ceduto_top_1_pct=round(top_pct, 2),
        alert=alert
    )

def calcola_rischio_diluizione(storico_resi: List[dict]) -> RischioDiluizione:
    """
    Calcola il tasso storico di diluizione (resi / fatturato).
    La regola aurea bancaria: Anticipo Max = 100% - (Tasso Diluizione * 2.5)
    """
    if not storico_resi:
        return RischioDiluizione(tasso_storico_pct=0.0, impatto_su_anticipo_suggerito=100.0, alert=False)
        
    tot_fatturato = sum(r.totale_fatturato for r in storico_resi)
    tot_resi = sum(r.totale_resi_o_note_credito for r in storico_resi)
    
    if tot_fatturato == 0:
        return RischioDiluizione(tasso_storico_pct=0.0, impatto_su_anticipo_suggerito=100.0, alert=False)
        
    tasso_pct = (tot_resi / tot_fatturato) * 100
    
    # Margin of safety multiplier is usually 2 to 3 times the historical dilution
    anticipo_max = max(50.0, 100.0 - (tasso_pct * 2.5))
    
    alert = tasso_pct > 5.0 # Più del 5% di resi storici è considerato anomalo/rischioso
    
    return RischioDiluizione(
        tasso_storico_pct=round(tasso_pct, 2),
        impatto_su_anticipo_suggerito=round(anticipo_max, 2),
        alert=alert
    )

def calcola_dso_portfolio(portafoglio: List[Fattura], oggi: date) -> DsoPortfolio:
    """
    Calcola il DSO (Days Sales Outstanding) medio ponderato e la % di fatture scadute.
    """
    if not portafoglio:
        return DsoPortfolio(dso_medio_ponderato=0.0, pct_scaduto_su_totale=0.0, alert_scaduto=False)

    totale = 0.0
    totale_scaduto = 0.0
    somma_giorni_ponderata = 0.0
    
    for f in portafoglio:
        totale += f.importo
        
        # Giorni concordati di pagamento
        giorni_concessi = (f.data_scadenza - f.data_emissione).days
        
        # Se la fattura è aperta ma non ancora scaduta vs se è già scaduta
        if f.stato == "Scaduta":
            totale_scaduto += f.importo
            giorni_effettivi = (oggi - f.data_emissione).days
            f.giorni_ritardo = (oggi - f.data_scadenza).days
        elif f.stato == "Aperta":
            giorni_effettivi = giorni_concessi
            f.giorni_ritardo = 0
        else: # Saldato/Contestato
            giorni_effettivi = giorni_concessi
            
        somma_giorni_ponderata += (giorni_effettivi * f.importo)
        
    if totale == 0:
         return DsoPortfolio(dso_medio_ponderato=0.0, pct_scaduto_su_totale=0.0, alert_scaduto=False)

    dso_medio = somma_giorni_ponderata / totale
    pct_scaduto = (totale_scaduto / totale) * 100
    
    alert = pct_scaduto > 15.0 or dso_medio > 120.0
    
    return DsoPortfolio(
        dso_medio_ponderato=round(dso_medio, 1),
        pct_scaduto_su_totale=round(pct_scaduto, 2),
        alert_scaduto=alert
    )
