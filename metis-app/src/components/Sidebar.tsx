"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  {
    href: "/home",
    title: "Home",
    description: "Dashboard pratiche e KPI",
    activeColor: "cyan",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4h-4v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
  },
  {
    href: "/dossier",
    title: "Dossier Dashboard",
    description: "Analisi creditizia e scoring",
    activeColor: "cyan",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>,
  },
  {
    href: "/rule-engine",
    title: "Visual Policy Editor",
    description: "Drag & drop rule builder con What-If",
    activeColor: "purple",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  },
  {
    href: "/copilot",
    title: "ARIA AI Copilot",
    description: "Assistente AI per analisi credito",
    activeColor: "green",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  },
  {
    href: "/data-hub",
    title: "Data Hub",
    description: "Gestione database e connessioni",
    activeColor: "cyan",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
  },
];


export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Toggle Button (Hamburger) when closed */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed top-6 left-6 z-50 w-10 h-10 rounded-xl bg-[rgba(9,13,20,0.85)] border border-white/10 flex items-center justify-center text-white/50 hover:text-[#00E5FF] hover:border-[#00E5FF]/50 transition-all backdrop-blur-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      )}

      {/* Sidebar */}
      <aside className={`w-[70px] h-full border-r border-white/10 flex flex-col items-center justify-between py-6 z-40 bg-[rgba(9,13,20,0.85)] backdrop-blur-xl shrink-0 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-[70px] -ml-[70px]"}`}>
        <div className="flex flex-col gap-5 w-full px-2 items-center relative">
          
          {/* Close Sidebar Button inside */}
          {isOpen && (
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute -right-3 top-2 w-6 h-6 rounded-full bg-[#0A0F14] border border-white/20 flex items-center justify-center text-white/50 hover:text-[#00E5FF] hover:border-[#00E5FF] z-50 shadow-lg cursor-pointer transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          )}

          <Link href="/home" className="mb-4 block hover:scale-110 transition-transform">
            <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-10 h-10 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
          </Link>

          {NAV.map((item) => {
            const isActive = pathname === item.href;
            const colorMap: Record<string, string> = {
              cyan: "bg-[#00E5FF]/10 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)] ring-1 ring-[#00E5FF]/50",
              purple: "bg-purple/20 text-purple shadow-[0_0_15px_rgba(123,44,191,0.2)] ring-1 ring-purple/50",
              green: "bg-green/10 text-green shadow-[0_0_15px_rgba(0,255,102,0.15)] ring-1 ring-green/50",
            };
            return (
              <Link key={item.href} href={item.href} className="relative group">
                <button className={`w-12 h-12 rounded-xl transition-all flex justify-center items-center ${isActive ? colorMap[item.activeColor] : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                  {item.icon}
                </button>
                {/* Tooltip */}
                <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/15 rounded-lg px-3 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="text-white text-xs font-semibold font-[var(--font-space)]">{item.title}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{item.description}</div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black/90 border-l border-b border-white/15 rotate-45"></div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4 mt-auto">
          <div className="font-[var(--font-space)] text-[8px] tracking-[0.2em] text-[#00E5FF] uppercase [writing-mode:vertical-lr] rotate-180 opacity-80 mb-2">METIS v2.0</div>
          <Link href="/login" className="relative group">
            <button className="w-12 h-12 rounded-full border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition flex justify-center items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
            {/* Tooltip */}
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
              <div className="bg-black/90 backdrop-blur-xl border border-white/15 rounded-lg px-3 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <div className="text-white text-xs font-semibold font-[var(--font-space)]">Logout</div>
                <div className="text-white/50 text-[10px] mt-0.5">Esci dalla sessione</div>
              </div>
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black/90 border-l border-b border-white/15 rotate-45"></div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
