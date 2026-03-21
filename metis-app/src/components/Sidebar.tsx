"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const NAV = [
  {
    href: "/home",
    title: "Home",
    activeColor: "cyan",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H9v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9z"></path></svg>,
  },
  {
    href: "/",
    title: "Dossier Dashboard",
    activeColor: "cyan",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>,
  },
  {
    href: "/rule-engine",
    title: "Visual Rule Engine",
    activeColor: "purple",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  },
  {
    href: "/copilot",
    title: "ARIA AI Copilot",
    activeColor: "green",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  },
];


export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[70px] h-full border-r border-white/10 flex flex-col items-center justify-between py-6 z-40 bg-[rgba(9,13,20,0.85)] backdrop-blur-xl shrink-0">
      <div className="flex flex-col gap-5 w-full px-2 items-center">
        <Link href="/home" className="mb-4 block hover:scale-110 transition-transform">
          <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-10 h-10 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
        </Link>

        {NAV.map((item: {href:string; title:string; activeColor:string; icon:any}) => {
          const isActive = pathname === item.href;
          const colorMap: Record<string, string> = {
            cyan: "bg-cyan/10 text-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)] ring-1 ring-cyan/50",
            purple: "bg-purple/20 text-purple shadow-[0_0_15px_rgba(123,44,191,0.2)] ring-1 ring-purple/50",
            green: "bg-green/10 text-green shadow-[0_0_15px_rgba(0,255,102,0.15)] ring-1 ring-green/50",
          };
          return (
            <Link key={item.href} href={item.href} title={item.title}>
              <button className={`w-12 h-12 rounded-xl transition-all flex justify-center items-center group ${isActive ? colorMap[item.activeColor] : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                {item.icon}
              </button>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
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

