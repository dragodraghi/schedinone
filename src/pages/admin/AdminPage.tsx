import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
  onLogout: () => void;
}

export default function AdminPage({ game, players, matches, onLogout }: Props) {
  const paidCount = players.filter((p) => p.paid).length;
  const prize = game.entryFee * paidCount;

  const pendingCount = players.filter((p) => p.scheduleStatus === "inviata").length;

  const kpis = [
    { label: "Iscritti", value: players.length, color: 'var(--accent)' },
    { label: "Montepremi", value: `€${prize}`, color: 'var(--gold)' },
    { label: "Partite", value: matches.length, color: 'var(--correct)' },
    { label: "In attesa", value: pendingCount, color: 'var(--gold)' },
  ];

  const actions = [
    { to: "/admin/riepilogo", label: "Riepilogo Schedine", icon: "📊" },
    { to: "/admin/schedine", label: "Schedine Ricevute", icon: "📬" },
    { to: "/admin/risultati", label: "Gestisci Risultati", icon: "🔄" },
    { to: "/admin/giocatori", label: "Gestisci Giocatori", icon: "👥" },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Pannello COMITATO</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestione partita</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl p-3 text-center">
            <p className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: kpi.color }}>{kpi.value}</p>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Current phase */}
      <div className="glass rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Fase corrente</p>
        <p className="text-xl font-black capitalize" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>{game.currentPhase}</p>
      </div>

      {/* Action links */}
      <div className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="btn-glow glass block w-full py-3.5 rounded-xl text-center font-bold transition-all hover:bg-white/5"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}
          >
            {action.icon} {action.label}
          </Link>
        ))}
      </div>

      <Link
        to="/"
        className="block text-center text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Torna alla Dashboard
      </Link>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="glass w-full py-3 font-bold rounded-xl transition-all duration-200 hover:bg-red-600/10"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.875rem',
          color: 'var(--wrong)',
          borderColor: 'rgba(255,51,102,0.4)',
        }}
      >
        Esci
      </button>
    </div>
  );
}
