import { Link } from "react-router-dom";
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
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Giocatori</h1>
        <div className="counter-pill px-3 py-1.5 rounded-full text-xs">
          <span style={{ color: 'var(--correct)' }}>{paidCount}</span>
          <span style={{ color: 'var(--text-muted)' }}>/{players.length} pagati</span>
        </div>
      </div>

      {/* Players list */}
      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.id}
            className="glass rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>{p.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.points} pt</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePaid(p.id, p.paid)}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: p.paid ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,102,0.1)',
                  color: p.paid ? 'var(--correct)' : 'var(--wrong)',
                  border: `1px solid ${p.paid ? 'rgba(0,255,136,0.35)' : 'rgba(255,51,102,0.35)'}`,
                }}
              >
                {p.paid ? "Pagato" : "Non pagato"}
              </button>
              <button
                onClick={() => removePlayer(p.id, p.name)}
                className="px-2 py-1 rounded text-xs transition-colors hover:bg-red-600/10"
                style={{ color: 'var(--wrong)' }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nessun giocatore</p>
        </div>
      )}

      <Link to="/admin" className="block text-center text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
        ← Admin
      </Link>
    </div>
  );
}
