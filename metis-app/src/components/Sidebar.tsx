"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[70px] h-full border-r border-white/10 flex flex-col items-center justify-between py-6 z-40 bg-[rgba(9,13,20,0.85)] backdrop-blur-xl shrink-0 transition-all duration-300">
      <div className="flex flex-col gap-6 w-full px-2 items-center">
        <Link href="/" className="mb-6 block hover:scale-110 transition-transform">
          <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-10 h-10 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
        </Link>
        
        {/* Dashboard Icon */}
        <Link href="/" title="Dossier Dashboard">
          <button className={`w-12 h-12 rounded-xl transition-all flex justify-center items-center group ${pathname === "/" ? "bg-cyan/10 text-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)] ring-1 ring-cyan/50" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={pathname === "/" ? "" : "group-hover:scale-110 transition-transform"}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        </Link>

        {/* Rule Engine Icon */}
        <Link href="/rule-engine" title="Visual Rule Engine">
          <button className={`w-12 h-12 rounded-xl transition-all flex justify-center items-center group ${pathname === "/rule-engine" ? "bg-purple/20 text-purple shadow-[0_0_15px_rgba(123,44,191,0.2)] ring-1 ring-purple/50" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={pathname === "/rule-engine" ? "" : "group-hover:scale-110 transition-transform"}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </button>
        </Link>

        {/* Onboarding Assistant Icon (Placeholder) */}
        <button className="w-12 h-12 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition flex justify-center items-center group cursor-not-allowed" title="AI Copilot (Coming Soon)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </button>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Link href="/login" title="Logout">
          <button className="w-12 h-12 rounded-full border border-white/10 text-white/40 hover:text-red hover:border-red/40 hover:bg-red/10 transition flex justify-center items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </Link>
        <div className="font-space text-[8px] tracking-[0.2em] text-text-muted uppercase [writing-mode:vertical-lr] rotate-180 opacity-50">METIS v2.0</div>
      </div>
    </aside>
  );
}
