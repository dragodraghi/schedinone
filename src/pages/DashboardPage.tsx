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
  const paidPlayers = players.filter((p) => p.paid).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  const cards = [
    { to: "/schedina", icon: "📋", label: "Schedina", sub: `${filledPredictions}/${totalMatches}`, accent: "#00d4ff" },
    { to: "/classifica", icon: "🏆", label: "Ranking", sub: `${rank}°/${players.length}`, accent: "#ffd700" },
    { to: "/profilo", icon: "📊", label: "Stats", sub: "% azzecco", accent: "#00ff88" },
    { to: "/profilo?tab=confronto", icon: "⚔️", label: "Sfida", sub: "Testa a testa", accent: "#ff3366" },
  ];

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>{player.name}</span>!
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {filledPredictions}/{totalMatches} pronostici inseriti
          </p>
        </div>
        <div className="counter-pill px-4 py-2 rounded-xl text-center">
          <div className="text-xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>{player.points}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>punti</div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="glass rounded-xl p-4 text-center transition-all duration-200 hover:scale-[1.02] group"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-2xl block group-hover:scale-110 transition-transform duration-200">{card.icon}</span>
            <p className="font-bold mt-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: card.accent }}>{card.label}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Prize pool */}
      <div className="glass rounded-xl p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.05), transparent 70%)' }} />
        <p className="text-[10px] uppercase tracking-[0.2em] relative" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Montepremi</p>
        <p className="text-3xl font-black mt-1 relative shimmer" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
          €{game.entryFee * paidPlayers}
        </p>
        <p className="text-[10px] mt-1 relative" style={{ color: 'var(--text-muted)' }}>{paidPlayers} iscritti</p>
      </div>
    </div>
  );
}
