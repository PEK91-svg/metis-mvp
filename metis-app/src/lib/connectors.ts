/**
 * Shared Data Connector Registry
 * Single source of truth used by both Data Hub and Rule Engine.
 */
export type ConnectorStatus = "live" | "config" | "inactive";

export interface DataConnector {
  id: string;
  label: string;
  group: "Bancario" | "Dati Aziendali" | "AI/NLP" | "ESG";
  latency?: string;
  status: ConnectorStatus;
}

export const DATA_CONNECTORS: DataConnector[] = [
  { id: "Bankitalia", label: "C.R. Bankitalia",        group: "Bancario",        latency: "2.4s", status: "live"     },
  { id: "XBRL",       label: "Bilancio XBRL (Europa)", group: "Bancario",        latency: "1.1s", status: "live"     },
  { id: "Cerved",     label: "Cerved Group APIs",       group: "Dati Aziendali",  latency: undefined, status: "config"   },
  { id: "NLP",        label: "Web NLP / Nowcasting",   group: "AI/NLP",          latency: "3.2s", status: "live"     },
  { id: "ESG",        label: "ESG Provider Level 2",   group: "ESG",             latency: undefined, status: "inactive" },
];
