import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Player } from "../../lib/types";

interface Props {
  players: Player[];
  gameId: string;
}

export default function GiocatoriPage({ players, gameId }: Props) {
  const togglePaid = async (playerId: string, currentPaid: boolean) => {
    const ref = doc(db, "games", gameId, "players", playerId);
    await updateDoc(ref, { paid: !currentPaid });
  };

  const removePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Rimuovere ${playerName} dal gioco?`)) return;
    const ref = doc(db, "games", gameId, "players", playerId);
    await deleteDoc(ref);
  };

  const paidCount = players.filter((p) => p.paid).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Giocatori</h1>
        <span className="text-sm text-slate-400">{paidCount}/{players.length} pagati</span>
      </div>
      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-slate-400">{p.points} pt</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => togglePaid(p.id, p.paid)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${p.paid ? "bg-green-600/20 text-green-400 border border-green-600" : "bg-red-600/20 text-red-400 border border-red-600"}`}>
                {p.paid ? "Pagato" : "Non pagato"}
              </button>
              <button onClick={() => removePlayer(p.id, p.name)} className="px-2 py-1 text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>
      {players.length === 0 && <p className="text-slate-400 text-center py-8">Nessun giocatore</p>}
    </div>
  );
}
