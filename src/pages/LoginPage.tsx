import { useState } from "react";

interface Props {
  onLogin: (name: string, code: string) => void;
  onAdminLogin?: (email: string, password: string) => Promise<void> | void;
  error?: string;
}

const PLAYER_CODE = "GIOCA2026";

export default function LoginPage({ onLogin, onAdminLogin, error }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [codeJustInserted, setCodeJustInserted] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPwd, setAdminPwd] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(name.trim(), code.trim());
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdminLogin) return;
    setAdminBusy(true);
    try {
      await onAdminLogin(adminEmail.trim(), adminPwd);
    } finally {
      setAdminBusy(false);
    }
  };

  const isValid = name.trim().length > 0 && code.trim().length > 0;
  const isAdminValid = adminEmail.trim().length > 0 && adminPwd.length > 0;

  /**
   * One-tap helper: copies the player code to the clipboard AND fills the
   * Codice gioco input field. Shows a short "✓ Inserito" confirmation.
   */
  const handleFillCode = async () => {
    setCode(PLAYER_CODE);
    try {
      await navigator.clipboard?.writeText(PLAYER_CODE);
    } catch {
      // Clipboard can fail (permission denied / insecure context) — the
      // field is still filled, so we don't need to block the user.
    }
    setCodeJustInserted(true);
    setTimeout(() => setCodeJustInserted(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08), transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(255, 215, 0, 0.03), transparent)' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(4, 8, 16, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="glass rounded-2xl p-5 w-full max-w-sm animate-in overflow-y-auto" style={{ maxHeight: '85vh', border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 0 40px rgba(0,212,255,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>Come funziona?</h2>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="space-y-4 text-sm" style={{ color: 'var(--text-primary)' }}>
              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>1. Accedi</h3>
                <p style={{ color: 'var(--text-muted)' }}>Inserisci il tuo nome e il codice gioco che ti ha dato il Comitato. Tocca "Entra in gioco".</p>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>2. Compila la Schedina</h3>
                <p style={{ color: 'var(--text-muted)' }}>Vai su 📋 Schedina. Per ogni partita, tocca <strong style={{ color: 'var(--accent)' }}>1</strong> (vince casa), <strong style={{ color: 'var(--accent)' }}>X</strong> (pareggio) o <strong style={{ color: 'var(--accent)' }}>2</strong> (vince trasferta). Scegli anche il Capocannoniere e la Vincitrice del Mondiale.</p>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>3. Invia al Comitato</h3>
                <p style={{ color: 'var(--text-muted)' }}>Tocca "Salva e Invia al Comitato". La schedina si blocca e viene inviata. Il Comitato la accettera' e i tuoi pronostici saranno visibili a tutti.</p>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>4. Punteggio</h3>
                <p style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--correct)' }}>1 punto</strong> per ogni risultato azzeccato (1, X o 2). Chi ha piu' punti vince il <strong>MONTEPREMI</strong>.</p>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>4bis. Premi speciali (in denaro, a parte)</h3>
                <p style={{ color: 'var(--text-muted)' }}>Capocannoniere e Squadra Vincitrice <strong>non danno punti in classifica</strong>. Danno due premi in denaro separati, divisi fra tutti quelli che li azzeccano. Gestiti dal Comitato a fine torneo.</p>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>5. Le Schermate</h3>
                <div className="space-y-1" style={{ color: 'var(--text-muted)' }}>
                  <p>⚡ <strong>Home</strong> — il tuo riepilogo</p>
                  <p>📋 <strong>Schedina</strong> — compila i pronostici</p>
                  <p>🏆 <strong>Ranking</strong> — classifica giocatori</p>
                  <p>📊 <strong>Griglione</strong> — tutti i pronostici a confronto</p>
                  <p>👤 <strong>Profilo</strong> — le tue statistiche</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>6. Installare sul telefono</h3>
                <p style={{ color: 'var(--text-muted)' }}><strong>Android:</strong> Chrome → menu ⋮ → "Aggiungi a schermata Home"</p>
                <p style={{ color: 'var(--text-muted)' }}><strong>iPhone:</strong> Safari → icona condivisione ↑ → "Aggiungi a schermata Home"</p>
              </div>
            </div>

            <button onClick={() => setShowHelp(false)}
              className="btn-glow w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase mt-5 transition-all"
              style={{ fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #00d4ff, #0099cc)', color: '#040810' }}>
              Ho capito!
            </button>
          </div>
        </div>
      )}

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
          <div className="text-[9px] mt-4 tracking-wider uppercase" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', opacity: 0.6 }}>
            by Alberto Pileri
          </div>
        </div>

        {/* Unified login — no visible "Comitato" toggle. The admin code still
            works when typed into the code field; players just never see an
            "admin" option to try guessing. */}
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
          <div className="glass rounded-xl px-4 py-3 text-sm font-bold animate-in"
            style={{ background: 'rgba(255,51,102,0.10)', border: '1px solid rgba(255,51,102,0.4)', color: 'var(--wrong)', fontFamily: 'Outfit, sans-serif' }}>
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

        <div className="flex gap-3">
          <button type="button" onClick={handleFillCode}
            className="btn-glow flex-1 py-3 rounded-xl font-bold tracking-wider transition-all glass text-center"
            style={{
              fontFamily: 'Outfit, sans-serif',
              color: codeJustInserted ? 'var(--correct)' : 'var(--accent)',
              borderColor: codeJustInserted ? 'rgba(0, 255, 136, 0.4)' : 'rgba(0, 212, 255, 0.3)',
              boxShadow: codeJustInserted ? '0 0 12px rgba(0, 255, 136, 0.25)' : undefined,
            }}
          >
            {codeJustInserted ? (
              <div>
                <div className="text-sm font-black">✓ Codice Inserito</div>
                <div className="text-[8px] mt-0.5 normal-case tracking-normal" style={{ color: 'var(--text-muted)' }}>
                  {PLAYER_CODE} · copiato anche negli appunti
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-black flex items-center justify-center gap-1.5">
                  <span>⧉</span>
                  <span>{PLAYER_CODE}</span>
                </div>
                <div className="text-[8px] mt-0.5 normal-case tracking-normal" style={{ color: 'var(--text-muted)' }}>
                  Tocca per copiare e inserire
                </div>
              </div>
            )}
          </button>
          <button type="button" onClick={() => setShowHelp(true)}
            className="btn-glow flex-1 py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all glass"
            style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)', borderColor: 'rgba(255, 215, 0, 0.3)' }}>
            Come funziona?
          </button>
        </div>

        <div className="pt-2">
          <button type="button" onClick={() => setAdminMode((v) => !v)}
            className="text-[10px] tracking-widest uppercase underline opacity-70 hover:opacity-100"
            style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif' }}>
            {adminMode ? 'Torna al login giocatore' : 'Sei del Comitato? Entra qui'}
          </button>
        </div>
      </form>

      {adminMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(4,8,16,0.9)', backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleAdminSubmit}
            className="glass rounded-2xl p-5 w-full max-w-sm space-y-4"
            style={{ border: '1px solid rgba(255,215,0,0.3)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
                Accesso Comitato
              </h2>
              <button type="button" onClick={() => setAdminMode(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <input type="email" placeholder="email@schedinone.local" value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)} autoComplete="email"
              className="w-full px-4 py-3 glass rounded-xl text-white placeholder-[#475569] focus:outline-none" />
            <input type="password" placeholder="Password" value={adminPwd}
              onChange={(e) => setAdminPwd(e.target.value)} autoComplete="current-password"
              className="w-full px-4 py-3 glass rounded-xl text-white placeholder-[#475569] focus:outline-none" />
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-bold"
                style={{ background: 'rgba(255,51,102,0.10)', border: '1px solid rgba(255,51,102,0.4)', color: 'var(--wrong)' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={!isAdminValid || adminBusy}
              className="btn-glow w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase disabled:opacity-30"
              style={{
                fontFamily: 'Outfit, sans-serif',
                background: isAdminValid ? 'linear-gradient(135deg, #ffd700, #c8a000)' : 'rgba(255,255,255,0.05)',
                color: isAdminValid ? '#040810' : '#475569',
              }}>
              {adminBusy ? 'Accesso...' : 'Entra come Comitato'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
