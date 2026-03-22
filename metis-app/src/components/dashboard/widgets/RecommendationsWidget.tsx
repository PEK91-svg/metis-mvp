"use client";

const items = [
  {
    priority: "ALTA",
    color: "#f87171",
    title: "Rivedi esposizione TECH SOLUZIONI SRL",
    sub: "PD > 7.2% — supera soglia di allerta",
    icon: "⚠",
  },
  {
    priority: "MEDIA",
    color: "#facc15",
    title: "Aggiorna rating METALLI UNITI SPA",
    sub: "Dati finanziari obsoleti (>180gg)",
    icon: "⏱",
  },
  {
    priority: "BASSA",
    color: "#00E5FF",
    title: "Opportunità espansione EDIL NORD SRL",
    sub: "Altman Z-score 3.1 — profilo stabile",
    icon: "✦",
  },
];

export default function RecommendationsWidget() {
  return (
    <div className="flex flex-col h-full w-full gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/40 uppercase tracking-widest">AI Recommendations</p>
        <span className="text-[10px] text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 px-2 py-0.5 rounded-full">
          {items.length} attive
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5"
              style={{ background: `${item.color}20`, color: item.color, boxShadow: `0 0 12px ${item.color}30` }}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: item.color, background: `${item.color}15` }}
                >
                  {item.priority}
                </span>
              </div>
              <p className="text-sm text-white/90 font-medium leading-snug group-hover:text-white transition-colors truncate">{item.title}</p>
              <p className="text-[11px] text-white/40 mt-0.5 truncate">{item.sub}</p>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-[#00E5FF] transition-colors shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Mini bar chart at bottom */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Urgenza per categoria</p>
        <div className="flex gap-2 items-end h-8">
          {[65, 40, 25, 80, 55, 35, 70].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${v}%`,
                background: i % 3 === 0 ? "#f87171" : i % 3 === 1 ? "#facc15" : "#00E5FF",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
