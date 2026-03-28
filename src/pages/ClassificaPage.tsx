import PlayerRow from "../components/PlayerRow";
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Classifica</h1>
      <div className="space-y-2">
        {players.map((p, i) => (
          <PlayerRow key={p.id} rank={i + 1} name={p.name} points={p.points} isCurrentUser={p.id === player.id} />
        ))}
      </div>
      {players.length === 0 && <p className="text-slate-400 text-center py-8">Nessun giocatore iscritto</p>}
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-sm text-slate-400">Montepremi</p>
        <p className="text-2xl font-bold text-yellow-500">€{prize}</p>
        <p className="text-xs text-slate-500 mt-1">{paidCount} iscritti × €{game.entryFee}</p>
      </div>
    </div>
  );
}
