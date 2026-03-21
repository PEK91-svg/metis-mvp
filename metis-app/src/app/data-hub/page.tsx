"use client";
import { useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

// ─── Types ──────────────────────────────────────────────────────────────────
type ConnectionType = "notion" | "postgresql" | "mongodb" | "redis" | "elasticsearch" | "s3";
type ConnectionStatus = "online" | "offline" | "syncing";

interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  lastSync: string;
  details: Record<string, string>;
  collections?: { name: string; rows: number; type: string }[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_CONNECTIONS: Connection[] = [
  {
    id: "notion-1",
    name: "Pratiche Creditizie",
    type: "notion",
    status: "online",
    lastSync: "2 min fa",
    details: { workspace: "Metis Credit", pages: "342", shared: "Si" },
    collections: [
      { name: "Pratiche Attive", rows: 187, type: "Database" },
      { name: "Clienti Corporate", rows: 94, type: "Database" },
      { name: "Audit Trail", rows: 1205, type: "Collection" },
      { name: "Delibere 2025", rows: 56, type: "Database" },
    ],
  },
  {
    id: "notion-2",
    name: "Knowledge Base Compliance",
    type: "notion",
    status: "online",
    lastSync: "15 min fa",
    details: { workspace: "Metis Legal", pages: "128", shared: "Si" },
    collections: [
      { name: "EU AI Act Checklist", rows: 47, type: "Database" },
      { name: "Policy Templates", rows: 23, type: "Collection" },
    ],
  },
  {
    id: "pg-1",
    name: "Metis Production DB",
    type: "postgresql",
    status: "online",
    lastSync: "Real-time",
    details: { host: "db.metis.internal", port: "5432", database: "metis_prod", version: "PostgreSQL 16 + TimescaleDB", ssl: "Enabled" },
    collections: [
      { name: "credit_applications", rows: 12450, type: "Table" },
      { name: "risk_scores", rows: 89200, type: "Table (TimeSeries)" },
      { name: "audit_events", rows: 456000, type: "Table" },
      { name: "kpi_snapshots", rows: 34100, type: "Hypertable" },
    ],
  },
  {
    id: "mongo-1",
    name: "Document Store",
    type: "mongodb",
    status: "online",
    lastSync: "5 min fa",
    details: { host: "mongo.metis.internal", port: "27017", database: "metis_docs", replica: "rs0 (3 nodes)" },
    collections: [
      { name: "bilanci_xbrl", rows: 8900, type: "Collection" },
      { name: "cerved_reports", rows: 3400, type: "Collection" },
      { name: "cr_raw_data", rows: 67800, type: "Collection" },
    ],
  },
  {
    id: "redis-1",
    name: "Cache Layer",
    type: "redis",
    status: "online",
    lastSync: "Live",
    details: { host: "redis.metis.internal", port: "6379", memory: "2.4 GB / 8 GB", keys: "145K", mode: "Cluster (3 shards)" },
    collections: [
      { name: "session:*", rows: 234, type: "Keys" },
      { name: "cache:scores:*", rows: 12400, type: "Keys" },
      { name: "queue:analysis:*", rows: 47, type: "Queue" },
    ],
  },
  {
    id: "es-1",
    name: "Search & Analytics",
    type: "elasticsearch",
    status: "syncing",
    lastSync: "Indexing...",
    details: { host: "es.metis.internal", port: "9200", cluster: "metis-search", version: "8.12", shards: "15", docs: "2.1M" },
    collections: [
      { name: "idx-credit-applications", rows: 124500, type: "Index" },
      { name: "idx-audit-logs", rows: 890000, type: "Index" },
      { name: "idx-web-sentiment", rows: 45600, type: "Index" },
    ],
  },
  {
    id: "s3-1",
    name: "Data Lake",
    type: "s3",
    status: "online",
    lastSync: "1h fa",
    details: { bucket: "metis-datalake-prod", region: "eu-south-1", storage: "1.2 TB", objects: "890K", encryption: "AES-256" },
    collections: [
      { name: "raw/bilanci/", rows: 89000, type: "Prefix" },
      { name: "processed/scores/", rows: 124000, type: "Prefix" },
      { name: "models/artifacts/", rows: 340, type: "Prefix" },
      { name: "reports/pdf/", rows: 56000, type: "Prefix" },
    ],
  },
];

// ─── Config per tipo ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ConnectionType, { label: string; color: string; icon: ReactNode; bgClass: string; borderClass: string; textClass: string }> = {
  notion: {
    label: "Notion MCP",
    color: "white",
    bgClass: "bg-white/10",
    borderClass: "border-white/30",
    textClass: "text-white",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.116 2.09c-.467-.373-.98-.746-2.054-.653L3.434 2.529c-.467.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.046-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.187 0-.653.327-.727l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.234 4.764 7.28v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.621 1.223l13.168-1c1.635-.14 2.054-.047 3.082.7l4.25 2.986c.7.514.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.95c0-.84.373-1.54 1.588-1.727z"/></svg>,
  },
  postgresql: {
    label: "PostgreSQL",
    color: "cyan",
    bgClass: "bg-cyan/10",
    borderClass: "border-cyan/30",
    textClass: "text-cyan",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  },
  mongodb: {
    label: "MongoDB",
    color: "green",
    bgClass: "bg-green/10",
    borderClass: "border-green/30",
    textClass: "text-green",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v12"/><path d="M8 10h8"/></svg>,
  },
  redis: {
    label: "Redis",
    color: "red",
    bgClass: "bg-red/10",
    borderClass: "border-red/30",
    textClass: "text-red",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  },
  elasticsearch: {
    label: "Elasticsearch",
    color: "yellow",
    bgClass: "bg-yellow/10",
    borderClass: "border-yellow/30",
    textClass: "text-yellow",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  s3: {
    label: "Amazon S3",
    color: "purple",
    bgClass: "bg-purple/10",
    borderClass: "border-purple/30",
    textClass: "text-purple",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
};

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dotClass: string; textClass: string }> = {
  online: { label: "Online", dotClass: "bg-green shadow-[0_0_8px_var(--color-green)]", textClass: "text-green" },
  offline: { label: "Offline", dotClass: "bg-red shadow-[0_0_8px_var(--color-red)]", textClass: "text-red" },
  syncing: { label: "Syncing", dotClass: "bg-yellow shadow-[0_0_8px_var(--color-yellow)] animate-pulse", textClass: "text-yellow" },
};

// ─── New Connection Form Fields ─────────────────────────────────────────────
const FORM_FIELDS: Record<ConnectionType, { label: string; placeholder: string; key: string }[]> = {
  notion: [
    { label: "API Key", placeholder: "ntn_...", key: "apiKey" },
    { label: "Workspace", placeholder: "Nome workspace", key: "workspace" },
  ],
  postgresql: [
    { label: "Host", placeholder: "db.example.com", key: "host" },
    { label: "Porta", placeholder: "5432", key: "port" },
    { label: "Database", placeholder: "nome_db", key: "database" },
    { label: "Username", placeholder: "user", key: "username" },
    { label: "Password", placeholder: "********", key: "password" },
  ],
  mongodb: [
    { label: "Connection String", placeholder: "mongodb://...", key: "connectionString" },
    { label: "Database", placeholder: "nome_db", key: "database" },
  ],
  redis: [
    { label: "Host", placeholder: "redis.example.com", key: "host" },
    { label: "Porta", placeholder: "6379", key: "port" },
    { label: "Password", placeholder: "********", key: "password" },
  ],
  elasticsearch: [
    { label: "Host", placeholder: "es.example.com", key: "host" },
    { label: "Porta", placeholder: "9200", key: "port" },
    { label: "Username", placeholder: "elastic", key: "username" },
    { label: "Password", placeholder: "********", key: "password" },
  ],
  s3: [
    { label: "Bucket", placeholder: "my-bucket", key: "bucket" },
    { label: "Region", placeholder: "eu-south-1", key: "region" },
    { label: "Access Key", placeholder: "AKIA...", key: "accessKey" },
    { label: "Secret Key", placeholder: "********", key: "secretKey" },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function DataHub() {
  const [activeTab, setActiveTab] = useState<"all" | "notion" | "external">("all");
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newConnType, setNewConnType] = useState<ConnectionType>("postgresql");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const filtered = MOCK_CONNECTIONS.filter((c) => {
    if (activeTab === "notion") return c.type === "notion";
    if (activeTab === "external") return c.type !== "notion";
    return true;
  });

  const totalConnections = MOCK_CONNECTIONS.length;
  const onlineCount = MOCK_CONNECTIONS.filter((c) => c.status === "online").length;
  const totalCollections = MOCK_CONNECTIONS.reduce((sum, c) => sum + (c.collections?.length || 0), 0);

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setTestingConnection(false);
      setTestResult("success");
    }, 2000);
  };

  return (
    <main className="flex h-screen w-screen bg-[var(--color-void)] overflow-hidden relative text-[13px] tracking-wide font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(0,229,255,0.06),_transparent_40%),radial-gradient(circle_at_70%_80%,_rgba(123,44,191,0.06),_transparent_40%)] pointer-events-none" />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-[70px] border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-10">
          <div>
            <h1 className="font-space text-lg text-white font-semibold">Data Hub</h1>
            <div className="flex items-center gap-2 text-xs font-space tracking-widest mt-0.5">
              <span className="text-cyan uppercase">Connessioni & Collection</span>
              <span className="text-white/30">&bull;</span>
              <span className="text-green px-2 py-[1px] rounded bg-green/10 border border-green/30 text-[9px] uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_6px_var(--color-green)]" />
                MCP Connected
              </span>
            </div>
          </div>
          <button
            onClick={() => { setShowNewModal(true); setTestResult(null); }}
            className="flex items-center gap-2 bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/30 rounded-lg px-5 py-2 text-xs font-semibold font-space transition shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:shadow-[0_0_20px_rgba(0,229,255,0.2)]"
          >
            <span className="text-base">+</span> Nuova Connessione
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left — Connection List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* KPI Bar */}
            <section className="grid grid-cols-4 gap-4 p-6 pb-0">
              {[
                { label: "Connessioni Attive", value: onlineCount, cls: "border-green/30 text-green bg-green/10" },
                { label: "Database Totali", value: totalConnections, cls: "border-cyan/30 text-cyan bg-cyan/10" },
                { label: "Collection", value: totalCollections, cls: "border-purple/30 text-purple bg-purple/10" },
                { label: "Ultimo Sync", value: "2 min", cls: "border-yellow/30 text-yellow bg-yellow/10" },
              ].map((kpi, i) => (
                <div key={i} className={`glass-panel flex flex-col items-center justify-center p-3 border ${kpi.cls}`}>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">{kpi.label}</span>
                  <span className="text-xl font-bold mt-1 font-space">{kpi.value}</span>
                </div>
              ))}
            </section>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-5 pb-3">
              {(["all", "notion", "external"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-space uppercase tracking-widest transition ${
                    activeTab === tab
                      ? "bg-cyan/10 text-cyan border border-cyan/30"
                      : "text-white/40 hover:text-white/60 border border-transparent hover:bg-white/5"
                  }`}
                >
                  {tab === "all" ? "Tutti" : tab === "notion" ? "Notion MCP" : "DB Esterni"}
                </button>
              ))}
            </div>

            {/* Connection List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
              {filtered.map((conn) => {
                const tc = TYPE_CONFIG[conn.type];
                const sc = STATUS_CONFIG[conn.status];
                const isSelected = selectedConn?.id === conn.id;
                return (
                  <button
                    key={conn.id}
                    onClick={() => setSelectedConn(conn)}
                    className={`w-full text-left glass-panel p-4 border transition-all hover:border-white/20 ${
                      isSelected ? "border-cyan/50 bg-cyan/5 shadow-[0_0_20px_rgba(0,229,255,0.08)]" : "border-glass-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${tc.bgClass} border ${tc.borderClass} flex items-center justify-center ${tc.textClass}`}>
                          {tc.icon}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{conn.name}</div>
                          <div className="text-text-muted text-[10px] font-space uppercase tracking-widest">{tc.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={`w-2 h-2 rounded-full ${sc.dotClass}`} />
                            <span className={`text-[10px] font-space uppercase tracking-widest ${sc.textClass}`}>{sc.label}</span>
                          </div>
                          <span className="text-[10px] text-text-muted">{conn.lastSync}</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Details Panel */}
          <div className="w-[380px] border-l border-white/10 bg-[rgba(14,21,33,0.95)] backdrop-blur-2xl flex flex-col overflow-hidden">
            {selectedConn ? (
              <>
                <div className="p-5 border-b border-white/10 bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${TYPE_CONFIG[selectedConn.type].bgClass} border ${TYPE_CONFIG[selectedConn.type].borderClass} flex items-center justify-center ${TYPE_CONFIG[selectedConn.type].textClass}`}>
                      {TYPE_CONFIG[selectedConn.type].icon}
                    </div>
                    <div>
                      <h2 className="font-space text-sm font-semibold text-white">{selectedConn.name}</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedConn.status].dotClass}`} />
                        <span className={`text-[10px] font-space uppercase tracking-widest ${STATUS_CONFIG[selectedConn.status].textClass}`}>
                          {STATUS_CONFIG[selectedConn.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Connection Details */}
                  <div>
                    <h3 className="text-[10px] text-text-muted font-space uppercase tracking-widest mb-3">Dettagli Connessione</h3>
                    <div className="space-y-1.5">
                      {Object.entries(selectedConn.details).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-text-muted text-[11px] capitalize">{key}</span>
                          <span className="text-white text-[11px] font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collections */}
                  {selectedConn.collections && (
                    <div>
                      <h3 className="text-[10px] text-text-muted font-space uppercase tracking-widest mb-3">
                        {selectedConn.type === "notion" ? "Database & Collection" : selectedConn.type === "s3" ? "Prefixes" : selectedConn.type === "redis" ? "Key Patterns" : "Tabelle & Indici"}
                      </h3>
                      <div className="space-y-1.5">
                        {selectedConn.collections.map((col, i) => (
                          <div key={i} className="flex justify-between items-center bg-black/30 rounded-lg px-3 py-2 border border-white/5 hover:border-white/15 transition cursor-pointer group">
                            <div className="flex items-center gap-2">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-cyan transition"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                              <span className="text-white text-[11px]">{col.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-text-muted font-space uppercase">{col.type}</span>
                              <span className="text-[10px] text-cyan font-mono">{col.rows.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-white/10 bg-black/40 flex gap-2">
                  <button className="flex-1 py-2.5 rounded-lg font-space text-[10px] font-bold uppercase tracking-widest bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 transition">
                    Sync Now
                  </button>
                  <button className="flex-1 py-2.5 rounded-lg font-space text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition">
                    Configura
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <p className="text-text-muted text-xs">Seleziona una connessione per visualizzare i dettagli</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── New Connection Modal ───────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div
            className="glass-panel border border-white/10 w-[500px] max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="font-space text-sm font-semibold text-white">Nuova Connessione</h2>
                <p className="text-[10px] text-text-muted mt-0.5">Configura un nuovo data source</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Type Selector */}
              <div>
                <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Tipo di Connessione</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_CONFIG) as ConnectionType[]).map((type) => {
                    const tc = TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        onClick={() => { setNewConnType(type); setTestResult(null); }}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                          newConnType === type
                            ? `${tc.bgClass} ${tc.borderClass} ${tc.textClass}`
                            : "bg-black/30 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                        }`}
                      >
                        {tc.icon}
                        <span className="text-[9px] font-space uppercase tracking-widest">{tc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connection Name */}
              <div>
                <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">Nome Connessione</label>
                <input
                  type="text"
                  placeholder="Es. Production Database"
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition"
                />
              </div>

              {/* Dynamic Fields */}
              {FORM_FIELDS[newConnType].map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] text-text-muted font-space uppercase tracking-widest block mb-2">{field.label}</label>
                  <input
                    type={field.key.toLowerCase().includes("password") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                    placeholder={field.placeholder}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan/50 transition font-mono"
                  />
                </div>
              ))}

              {/* Test Connection */}
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className={`w-full py-2.5 rounded-lg font-space text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                  testResult === "success"
                    ? "bg-green/10 text-green border border-green/30"
                    : testingConnection
                    ? "bg-yellow/10 text-yellow border border-yellow/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                }`}
              >
                {testingConnection ? (
                  <>
                    <span className="w-3 h-3 border-2 border-yellow/50 border-t-yellow rounded-full animate-spin" />
                    Testing...
                  </>
                ) : testResult === "success" ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Connessione Riuscita
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 rounded-lg font-space text-xs font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition"
              >
                Annulla
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg font-space text-xs font-bold uppercase tracking-widest transition ${
                  testResult === "success"
                    ? "bg-gradient-to-r from-cyan to-[rgba(0,229,255,0.6)] text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    : "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                }`}
                onClick={() => { if (testResult === "success") setShowNewModal(false); }}
              >
                Salva Connessione
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
