import { useState } from "react";

interface Props {
  onLogin: (name: string, code: string) => void;
  error?: string;
}

export default function LoginPage({ onLogin, error }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(name.trim(), code.trim());
  };

  const isValid = name.trim().length > 0 && code.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08), transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(255, 215, 0, 0.03), transparent)' }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-8 text-center relative z-10 animate-in">
        <div className="space-y-3">
          <div className="text-5xl mb-4 shimmer">⚽</div>
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #00d4ff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SCHEDINONE
          </h1>
          <p className="text-sm tracking-[0.3em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
            Mondiali 2026
          </p>
          <div className="flex items-center gap-3 justify-center mt-2">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, var(--accent))' }} />
            <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Pronostici</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, var(--accent))' }} />
          </div>
          <div className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            FIFA World Cup 2026 — USA / Mexico / Canada
          </div>
        </div>

        <div className="space-y-3">
          <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="w-full px-4 py-3.5 glass rounded-xl text-white placeholder-[#475569] focus:outline-none transition-all duration-200"
            style={{ borderColor: name ? 'rgba(0, 212, 255, 0.3)' : 'var(--border)' }} />
          <input type="text" placeholder="Codice gioco" value={code} onChange={(e) => setCode(e.target.value)}
            maxLength={30}
            className="w-full px-4 py-3.5 glass rounded-xl text-white placeholder-[#475569] focus:outline-none transition-all duration-200"
            style={{ borderColor: code ? 'rgba(0, 212, 255, 0.3)' : 'var(--border)' }} />
        </div>

        {error && (
          <div
            className="glass rounded-xl px-4 py-3 text-sm font-bold animate-in"
            style={{
              background: 'rgba(255,51,102,0.10)',
              border: '1px solid rgba(255,51,102,0.4)',
              color: 'var(--wrong)',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={!isValid}
          className="btn-glow w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-30"
          style={{
            fontFamily: 'Outfit, sans-serif',
            background: isValid ? 'linear-gradient(135deg, #00d4ff, #0099cc)' : 'rgba(255,255,255,0.05)',
            color: isValid ? '#040810' : '#475569',
            boxShadow: isValid ? '0 0 30px rgba(0, 212, 255, 0.2)' : 'none'
          }}>
          Entra in gioco
        </button>
      </form>
    </div>
  );
}
