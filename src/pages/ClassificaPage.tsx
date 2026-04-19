import PlayerRow from "../components/PlayerRow";
import EmptyState from "../components/EmptyState";
import type { Game, Player } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
}

export default function ClassificaPage({ game, player, players }: Props) {
  const paidCount = players.filter((p) => p.paid).length;
  const prize = game.entryFee * paidCount;

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Classifica</h1>
        <div className="counter-pill px-3 py-1.5 rounded-full text-xs">
          <span style={{ color: 'var(--accent)' }}>{players.length}</span>
          <span style={{ color: 'var(--text-muted)' }}> giocatori</span>
        </div>
      </div>

      {/* Players list */}
      <div className="space-y-2">
        {players.map((p, i) => (
          <PlayerRow key={p.id} rank={i + 1} name={p.name} points={p.points} isCurrentUser={p.id === player.id} />
        ))}
      </div>

      {players.length === 0 && (
        <EmptyState
          icon="🏆"
          title="Nessun giocatore iscritto"
          description="Appena i primi giocatori entreranno con il codice, li vedrai comparire qui."
          accent="muted"
        />
      )}

      {/* Montepremi card */}
      <div className="glass rounded-xl p-5 text-center">
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Montepremi</p>
        <p className="text-4xl font-black shimmer" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>€{prize}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{paidCount} iscritti × €{game.entryFee}</p>
      </div>
    </div>
  );
}
