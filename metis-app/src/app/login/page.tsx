"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate authentication
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 1500);
  };

  return (
    <main className="flex items-center justify-center min-h-screen w-screen bg-[var(--color-void)] relative overflow-hidden font-inter text-text-main">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(123,44,191,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(0,229,255,0.1),_transparent_50%)] pointer-events-none"></div>
      
      {/* Animated nodes in background */}
      <div className="absolute top-[20%] left-[15%] w-64 h-64 bg-purple/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-cyan/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 flex flex-col md:flex-row max-w-[1000px] w-full mx-6 rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Left Side - Brand & Value Prop */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-black/80 to-[rgba(14,21,33,1)] border-r border-white/5 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <img src="/finomnia-logo.png" alt="FINOMNIA" className="w-12 h-12 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.2)]" />
                <span className="font-space font-bold text-3xl tracking-widest text-white">METIS</span>
             </div>
             <div className="inline-block border border-cyan/30 bg-cyan/10 text-cyan text-[10px] font-space tracking-widest uppercase px-3 py-1 rounded-full mb-8">
               Credit Decision Intelligence v2.0
             </div>
             <h2 className="text-3xl font-light text-white leading-tight mb-6">
               Decidi con <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple">Precisione.</span><br/>
               Finanzia con <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green to-yellow">Fiducia.</span>
             </h2>
             <p className="text-text-muted text-sm leading-relaxed max-w-sm">
               Il primo sistema "Glass-Box" europeo per l'Origination del Credito Pmi, validato e conforme all'EU AI Act. Scarta i bias, automatizza fino al 75% dei dossier.
             </p>
          </div>

          <div className="relative z-10 mt-16 font-space text-[10px] tracking-widest uppercase text-text-muted opacity-50">
            Powered by Finomnia AI Research
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-col justify-center w-full md:w-1/2 p-10 lg:p-14 bg-[rgba(9,13,20,0.6)] backdrop-blur-md">
          
          <div className="mb-8">
            <h3 className="font-space text-2xl font-bold text-white mb-2">Login to Platform</h3>
            <p className="text-text-muted text-xs">Inserisci le credenziali del Comitato Crediti o Risk Manager.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-space text-[10px] uppercase tracking-wider text-text-muted mb-2">Institutional Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-cyan transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 rounded-lg py-3 pl-10 pr-4 text-sm text-white transition-all placeholder:text-white/20"
                  placeholder="name@bank.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-space text-[10px] uppercase tracking-wider text-text-muted">Password</label>
                <a href="#" className="font-space text-[10px] text-cyan hover:underline">Forgot password?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-purple transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/50 rounded-lg py-3 pl-10 pr-4 text-sm text-white transition-all placeholder:text-white/20"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-6 py-3.5 rounded-lg font-space font-bold uppercase tracking-widest transition-all relative overflow-hidden group border
                ${loading 
                  ? 'bg-transparent border-cyan text-cyan' 
                  : 'bg-gradient-to-r from-cyan to-purple text-white border-transparent hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <span className="relative z-10">Access Workspace</span>
              )}
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full bg-white/20 skew-x-12 group-hover:animate-[shine_1.5s_ease-out_infinite]"></div>
            </button>
            <style dangerouslySetInnerHTML={{__html: `
               @keyframes shine {
                  100% { transform: translateX(200%); }
               }
            `}} />
          </form>
          
          <div className="mt-8 text-center text-xs text-text-muted">
             Protected by Finomnia Dual-Auth Security and EU KMS.
          </div>
        </div>
      </div>
    </main>
  );
}
