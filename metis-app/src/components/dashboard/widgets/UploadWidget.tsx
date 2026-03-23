"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";

export function UploadWidget() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovered(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    if (isUploading) return;
    setIsUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.push("/analisi-bilancio");
          }, 800);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.xml,.json"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={() => setIsHovered(false)}
        onDrop={handleDrop}
        className={`w-full max-w-[280px] aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 cursor-pointer relative overflow-hidden ${
          isHovered
            ? "border-cyan/60 bg-cyan/5 scale-[1.02]"
            : "border-white/10 bg-black/40 hover:border-cyan/30 hover:bg-white/5"
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center w-full z-10 transition-all">
            <div className="w-16 h-16 rounded-full border border-cyan/30 bg-cyan/10 flex items-center justify-center mb-4 relative">
              {progress === 100 ? (
                <CheckCircle2 className="w-8 h-8 text-[#00FF66]" />
              ) : (
                <FileText className="w-8 h-8 text-cyan animate-pulse" />
              )}
              {progress < 100 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="31"
                    className="stroke-[#00E5FF]"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="194.7"
                    strokeDashoffset={194.7 - (194.7 * progress) / 100}
                    style={{ transition: "stroke-dashoffset 0.1s linear" }}
                  />
                </svg>
              )}
            </div>
            
            <span className="text-sm font-space text-white uppercase tracking-wider mb-2 text-center">
              {progress === 100 ? "Estrazione completata" : "Analisi Documento..."}
            </span>
            
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-1 overflow-hidden">
              <div
                className="bg-cyan h-1.5 rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_#00E5FF]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-cyan/60 font-space">{progress}% completato</span>
          </div>
        ) : (
          <div className="flex flex-col items-center z-10">
            <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_25px_rgba(0,229,255,0.2)] transition-all">
              <UploadCloud className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide font-space text-center">
              Carica Bilancio
            </h3>
            <p className="text-[10px] text-white/40 text-center font-space leading-relaxed max-w-[200px]">
              Trascina qui o clicca per caricare un file (PDF / JSON / XML)
            </p>
          </div>
        )}

        {/* Animated background lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute left-1/4 top-0 w-px h-full bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse delay-1000" />
          <div className="absolute right-1/4 top-0 w-px h-full bg-gradient-to-b from-transparent via-cyan to-transparent animate-pulse delay-500" />
        </div>
      </div>
    </div>
  );
}
