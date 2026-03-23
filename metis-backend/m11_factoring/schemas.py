from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class Ceduto(BaseModel):
    partita_iva: str
    ragione_sociale: str
    settore_ateco: Optional[str] = None
    rating_esterno: Optional[str] = None  # es. "A", "BBB", "Junk"

class Fattura(BaseModel):
    id_fattura: str
    ceduto_piva: str
    importo: float
    data_emissione: date
    data_scadenza: date
    stato: str  # "Aperta", "Scaduta", "Saldato", "Contestata"
    giorni_ritardo: int = 0  # 0 se non scaduta
    
class StoricoResi(BaseModel):
    anno: int
    totale_fatturato: float
    totale_resi_o_note_credito: float
    note: Optional[str] = None

class M11Input(BaseModel):
    id_pratica: str
    cedente_piva: str
    cedente_ragione_sociale: str
    ceduti: List[Ceduto]
    portafoglio_fatture: List[Fattura]
    storico_resi: List[StoricoResi] = Field(default_factory=list)

class RischioConcentrazione(BaseModel):
    hhi_index: float
    ceduto_top_1_piva: str
    ceduto_top_1_pct: float
    alert: bool

class RischioDiluizione(BaseModel):
    tasso_storico_pct: float
    impatto_su_anticipo_suggerito: float  # es. se diluizione 5%, anticipo max 85%
    alert: bool

class DsoPortfolio(BaseModel):
    dso_medio_ponderato: float
    pct_scaduto_su_totale: float
    alert_scaduto: bool

class M11Output(BaseModel):
    id_pratica: str
    score_globale: int  # 0-100 (100 = ottimo)
    rating_portafoglio: str  # A, B, C, D, E
    valore_totale_portafoglio: float
    concentrazione: RischioConcentrazione
    diluizione: RischioDiluizione
    dso_metrica: DsoPortfolio
    raccomandazione_xai: str
    sublimits_suggeriti: dict[str, float]  # Mappa p.iva -> importo massimo affidabile
