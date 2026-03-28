import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
}

export default function AdminPage({ game, players, matches }: Props) {
  const paidCount = players.filter((p) => p.paid).length;
  const prize = game.entryFee * paidCount;

  const kpis = [
    { label: "Iscritti", value: players.length },
    { label: "Montepremi", value: `€${prize}` },
    { label: "Partite", value: matches.length },
  ];

  const actions = [
    { to: "/admin/risultati", label: "Gestisci Risultati", icon: "🔄" },
    { to: "/admin/giocatori", label: "Gestisci Giocatori", icon: "👥" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Pannello COMITATO</h1>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-xs text-slate-400 uppercase font-bold">Fase corrente</p>
        <p className="text-lg font-bold capitalize">{game.currentPhase}</p>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <Link key={action.to} to={action.to} className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-center font-bold rounded-xl transition-colors">
            {action.icon} {action.label}
          </Link>
        ))}
      </div>
      <Link to="/" className="block text-center text-sm text-slate-400 hover:text-white transition-colors">← Torna alla Dashboard</Link>
    </div>
  );
}
