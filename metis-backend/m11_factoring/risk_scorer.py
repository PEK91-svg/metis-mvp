from __future__ import annotations
from typing import List, Dict, Any
from collections import defaultdict
from .schemas import M11Input, M11Output, RischioConcentrazione, RischioDiluizione, DsoPortfolio

class FactoringRiskScorer:
    """
    Calcola lo score globale del portafoglio factoring combinando:
    1. Rating base dei debitori (ceduti) - Peso 40%
    2. Concentrazione (HHI e top debtor) - Peso 20%
    3. Storico performance (Diluizione) - Peso 20%
    4. Qualità del credito (Scaduto e DSO) - Peso 20%
    """
    
    RATING_MAP = {
        "AAA": 100, "AA": 95, "A": 90,
        "BBB": 75, "BB": 60, "B": 45,
        "CCC": 30, "CC": 20, "C": 10,
        "D": 0, "Default": 0, None: 60 # Neutral for unrated
    }

    def _score_ceduti(self, data: M11Input) -> float:
        """Calcola la media ponderata dei rating assegnati ai debitori."""
        if not data.ceduti or not data.portafoglio_fatture:
            return 60.0 # Default medio

        rating_piva = {c.partita_iva: self.RATING_MAP.get(c.rating_esterno, 60) for c in data.ceduti}
        
        totale_valore = 0
        score_pesato = 0
        
        for f in data.portafoglio_fatture:
            valore = f.importo
            totale_valore += valore
            score_pesato += valore * rating_piva.get(f.ceduto_piva, 60)
            
        return score_pesato / totale_valore if totale_valore > 0 else 60.0

    def _score_concentrazione(self, metrics: RischioConcentrazione) -> float:
        """Fino a HHI 1500=100%, penalizza linearmente oltre."""
        if metrics.hhi_index <= 1500:
            return 100.0
        elif metrics.hhi_index >= 5000:
            return 20.0
        else:
            # Scala da 100 a 20 tra 1500 e 5000
            return 100.0 - ((metrics.hhi_index - 1500) / 3500) * 80.0

    def _score_diluizione(self, metrics: RischioDiluizione) -> float:
        """0-1% = 100, penalizza rapidamente oltre il 3%."""
        d = metrics.tasso_storico_pct
        if d <= 1.0: return 100.0
        if d >= 10.0: return 0.0
        return 100.0 - ((d - 1.0) / 9.0) * 100.0

    def _score_scaduto(self, metrics: DsoPortfolio) -> float:
        """Penalizza la percentuale di scaduto."""
        s = metrics.pct_scaduto_su_totale
        if s <= 2.0: return 100.0
        if s >= 30.0: return 0.0
        return 100.0 - ((s - 2.0) / 28.0) * 100.0

    def generate_score(self, 
                      data: M11Input, 
                      concentrazione: RischioConcentrazione,
                      diluizione: RischioDiluizione,
                      dso: DsoPortfolio) -> tuple[int, str]:
        
        sc_ceduti = self._score_ceduti(data)
        sc_conc = self._score_concentrazione(concentrazione)
        sc_dil = self._score_diluizione(diluizione)
        sc_scad = self._score_scaduto(dso)
        
        # Pesi
        final_score = (sc_ceduti * 0.40) + (sc_conc * 0.20) + (sc_dil * 0.20) + (sc_scad * 0.20)
        final_score = max(0, min(100, int(round(final_score))))
        
        # Rating globale
        if final_score >= 85: rating = "A (Ottimo)"
        elif final_score >= 70: rating = "B (Buono)"
        elif final_score >= 55: rating = "C (Sufficiente)"
        elif final_score >= 40: rating = "D (Vulnerabile)"
        else: rating = "E (Alto Rischio)"
        
        return final_score, rating

    def calcola_sublimits(self, data: M11Input, concentrazione: RischioConcentrazione) -> dict[str, float]:
        """
        Calcola i limiti massimi affidabili per singolo ceduto, 
        basandosi su una regola prudenziale (max 20% del totale plafond).
        """
        totale_portafoglio = sum(f.importo for f in data.portafoglio_fatture)
        limite_max_singolo = totale_portafoglio * 0.20  # Max 20% concentration rule
        
        sublimits = {}
        # Mappa i ceduti per esposizione e applica il cap
        esposizione_ceduti = defaultdict(float)
        for f in data.portafoglio_fatture:
            esposizione_ceduti[f.ceduto_piva] += f.importo
            
        for piva, amount in esposizione_ceduti.items():
            if amount > limite_max_singolo:
                sublimits[piva] = round(limite_max_singolo, 2)
            else:
                sublimits[piva] = round(amount, 2)
                
        return sublimits
