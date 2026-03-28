import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
}

export default function DashboardPage({ game, player, players, matches }: Props) {
  const totalMatches = matches.length;
  const filledPredictions = Object.keys(player.predictions).length;
  const rank = players.findIndex((p) => p.id === player.id) + 1;

  const cards = [
    { to: "/schedina", icon: "📝", label: "Schedina", sub: `${filledPredictions}/${totalMatches} compilati` },
    { to: "/classifica", icon: "🏆", label: "Classifica", sub: `Posizione: ${rank}°/${players.length}` },
    { to: "/profilo", icon: "📊", label: "Statistiche", sub: `% azzecco` },
    { to: "/profilo?tab=confronto", icon: "⚽", label: "Confronto", sub: "Testa a testa" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Ciao {player.name}!</h1>
          <p className="text-sm text-slate-400">{filledPredictions}/{totalMatches} pronostici inseriti</p>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-xl font-bold">{player.points} punti</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors">
            <span className="text-2xl">{card.icon}</span>
            <p className="font-bold mt-2">{card.label}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-sm text-slate-400">Montepremi</p>
        <p className="text-2xl font-bold text-yellow-500">€{game.entryFee * players.filter((p) => p.paid).length}</p>
      </div>
    </div>
  );
}
