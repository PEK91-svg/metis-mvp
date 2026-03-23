from typing import Dict, Any

class FactoringXAIAgent:
    """
    Agente XAI (Explainable AI) per il modulo Factoring.
    Traduce i risultati matematici del portafoglio in una narrativa chiara per l'analista fidi,
    spiegando il perché del rating assegnato e sollevando alert di compliance.
    """
    
    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return f"""
        Sei un Senior Credit Analyst specializzato in Factoring.
        Analizza i seguenti risultati di un portafoglio fatture e scrivi una sintesi di 3 frasi 
        per il comitato fidi. Evidenzia rischi di concentrazione e diluizione.
        
        DATI PORTAFOGLIO:
        - Score Globale: {context['score']}/100 ({context['rating']})
        - Indice Concentrazione HHI: {context['hhi']} (Alert: {context['alert_hhi']})
        - Principale Debitore: {context['top_ceduto']} al {context['top_pct']}% del totale
        - DSO Medio Ponderato: {context['dso']} giorni
        - % Fatture Scadute: {context['scaduto_pct']}%
        - Tasso Storico Diluizione: {context['diluizione_pct']}% (Alert: {context['alert_dil']})
        """

    def generate_narrative(self, context: Dict[str, Any]) -> str:
        """
        Simulazione della chiamata LLM (Anthropic Claude 3.5 Sonnet o OpenAI).
        Genera la stringa narrativa basata sui threshold, 
        risparmiando l'effettiva exec LLM in fase di test.
        """
        # In produzione qui ci sarebbe la chiamata: llm_client.generate(self._build_prompt(context))
        
        narrativa = f"Il portafoglio ottiene uno score di {context['score']}/100 ({context['rating']}). "
        
        if context['alert_hhi']:
            narrativa += f"<span class='text-red'>Attenzione: forte rischio di concentrazione</span> sul ceduto {context['top_ceduto']} che pesa per il {context['top_pct']}%. Si raccomanda un sub-limit dedicato. "
        else:
            narrativa += "Il portafoglio risulta ben frammentato (HHI basso), mitigando il rischio di default del singolo ceduto. "
            
        if context['alert_dil']:
            narrativa += f"Il tasso storico di diluizione del {context['diluizione_pct']}% è oltre la soglia di guardia; si raccomanda un anticipo massimo non superiore all'{context['anticipo_suggerito']}%. "
        else:
            narrativa += f"Diluizione storica fisiologica ({context['diluizione_pct']}%). "
            
        if context['scaduto_pct'] > 15.0:
            narrativa += f"Rilevata incidenza anomala del portafoglio scaduto ({context['scaduto_pct']}% del totale): approfondire le cause dei ritardi commerciali."
            
        return narrativa
