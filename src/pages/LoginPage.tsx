import { useState } from "react";

interface Props {
  onLogin: (name: string, code: string) => void;
  onAdminLogin?: (email: string, password: string) => Promise<void> | void;
  error?: string;
}

export default function LoginPage({ onLogin, onAdminLogin, error }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showHelp, setShowHelp] = useState(false);
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

  return (
    <div className="min-h-screen overflow-hidden px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-md flex-col justify-center">
        <form onSubmit={handleSubmit} className="animate-in space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl border border-[rgba(0,212,255,0.28)] bg-[rgba(0,212,255,0.08)] text-lg font-black text-[var(--accent)] shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
              26
            </div>
            <p className="page-kicker justify-center">Mondiali 2026</p>
            <h1 className="text-4xl font-black sm:text-5xl">SCHEDINONE</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--text-soft)]">
              Pronostici, classifica e messaggi del Comitato in un'unica app.
            </p>
            <div className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--gold)] opacity-70">
              by Alberto Pileri
            </div>
          </div>

          <div className="surface-panel space-y-4 p-4 sm:p-5">
            <div className="space-y-3">
              <label className="block">
                <span className="micro-label mb-2 block">Squadra</span>
                <input
                  type="text"
                  placeholder="Nome della tua squadra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="app-field w-full"
                  style={{ borderColor: name ? "rgba(0, 212, 255, 0.36)" : "var(--border)" }}
                />
              </label>
              <label className="block">
                <span className="micro-label mb-2 block">Password</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={30}
                  autoComplete="current-password"
                  className="app-field w-full"
                  style={{ borderColor: code ? "rgba(0, 212, 255, 0.36)" : "var(--border)" }}
                />
              </label>
            </div>

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm font-bold"
                style={{
                  background: "rgba(255,51,102,0.10)",
                  border: "1px solid rgba(255,51,102,0.4)",
                  color: "var(--wrong)",
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={!isValid} className="primary-action w-full">
              Entra in gioco
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="w-full rounded-lg border border-[rgba(255,215,0,0.28)] bg-[rgba(255,215,0,0.07)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-[var(--gold)] transition hover:bg-[rgba(255,215,0,0.12)]"
            >
              Come funziona?
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setAdminMode((v) => !v)}
              className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--gold)] opacity-75 underline underline-offset-4 transition hover:opacity-100"
            >
              {adminMode ? "Torna al login giocatore" : "Sei del Comitato? Entra qui"}
            </button>
          </div>
        </form>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(4,8,16,0.88)", backdropFilter: "blur(10px)" }}
        >
          <div className="surface-panel w-full max-w-sm animate-in overflow-y-auto p-5" style={{ maxHeight: "85vh" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[var(--accent)]">Come funziona?</h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-[rgba(255,255,255,0.06)] text-sm font-black text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                aria-label="Chiudi guida"
              >
                X
              </button>
            </div>

            <div className="space-y-4 text-sm text-[var(--text-primary)]">
              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">1. Accedi</h3>
                <p className="text-[var(--text-muted)]">
                  Inserisci il nome della tua squadra e la password che ti ha dato il Comitato. Tocca "Entra in gioco".
                </p>
                <p className="mt-2 text-[var(--text-muted)]">
                  Il nome squadra e' pubblico, ma non basta per entrare: se una squadra e' gia' registrata da un altro
                  dispositivo, l'accesso viene bloccato e non si puo' entrare nell'account di un'altra squadra.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">2. Compila la Schedina</h3>
                <p className="text-[var(--text-muted)]">
                  Vai su Schedina. Per ogni partita, tocca <strong className="text-[var(--accent)]">1</strong>,
                  <strong className="text-[var(--accent)]"> X</strong> o
                  <strong className="text-[var(--accent)]"> 2</strong>. Scegli anche il Capocannoniere e la Vincitrice
                  del Mondiale.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">3. Invia al Comitato</h3>
                <p className="text-[var(--text-muted)]">
                  Tocca "Salva e Invia al Comitato". La schedina si blocca e viene inviata. Il Comitato la accettera' e
                  i tuoi pronostici saranno visibili a tutti.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">4. Pagamento</h3>
                <p className="text-[var(--text-muted)]">
                  La quota e' di <strong className="text-[var(--gold)]">50 euro</strong>. Bonifico a Alberto Pileri,
                  IBAN <strong>LT86 3250 0662 0278 3701</strong>. Causale: nome della tua squadra.
                  La schedina viene accettata dopo verifica del pagamento.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">5. Punteggio</h3>
                <p className="text-[var(--text-muted)]">
                  <strong className="text-[var(--correct)]">1 punto</strong> per ogni risultato azzeccato. Chi ha piu'
                  punti vince il <strong>MONTEPREMI</strong>.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">6. Premi speciali</h3>
                <p className="text-[var(--text-muted)]">
                  Capocannoniere e Squadra Vincitrice non danno punti in classifica. Sono premi separati gestiti dal
                  Comitato a fine torneo.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-black text-[var(--gold)]">7. Schermate</h3>
                <div className="space-y-1 text-[var(--text-muted)]">
                  <p>
                    <strong>Home</strong> - stato schedina e prossima partita
                  </p>
                  <p>
                    <strong>Schedina</strong> - compila i pronostici
                  </p>
                  <p>
                    <strong>Classifica</strong> - punti e montepremi
                  </p>
                  <p>
                    <strong>Griglione</strong> - tutti i pronostici accettati
                  </p>
                </div>
              </section>
            </div>

            <button type="button" onClick={() => setShowHelp(false)} className="primary-action mt-5 w-full">
              Ho capito!
            </button>
          </div>
        </div>
      )}

      {adminMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(4,8,16,0.88)", backdropFilter: "blur(10px)" }}
        >
          <form onSubmit={handleAdminSubmit} className="surface-panel w-full max-w-sm space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[var(--gold)]">Accesso Comitato</h2>
              <button
                type="button"
                onClick={() => setAdminMode(false)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-[rgba(255,255,255,0.06)] text-sm font-black text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                aria-label="Chiudi accesso Comitato"
              >
                X
              </button>
            </div>
            <input
              type="email"
              placeholder="email@schedinone.local"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              autoComplete="email"
              className="app-field w-full"
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPwd}
              onChange={(e) => setAdminPwd(e.target.value)}
              autoComplete="current-password"
              className="app-field w-full"
            />
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm font-bold"
                style={{
                  background: "rgba(255,51,102,0.10)",
                  border: "1px solid rgba(255,51,102,0.4)",
                  color: "var(--wrong)",
                }}
              >
                {error}
              </div>
            )}
            <button type="submit" disabled={!isAdminValid || adminBusy} className="primary-action w-full">
              {adminBusy ? "Accesso..." : "Entra come Comitato"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
