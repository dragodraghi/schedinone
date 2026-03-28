import { useState } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Player } from "../../lib/types";

interface Props {
  players: Player[];
  gameId: string;
}

export default function GiocatoriPage({ players, gameId }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  const togglePaid = async (playerId: string, currentPaid: boolean) => {
    try {
      const ref = doc(db, "games", gameId, "players", playerId);
      await updateDoc(ref, { paid: !currentPaid });
    } catch (err) {
      console.error("Toggle paid error:", err);
    }
  };

  const removePlayer = async () => {
    if (!confirmDeleteId) return;
    try {
      const ref = doc(db, "games", gameId, "players", confirmDeleteId);
      await deleteDoc(ref);
    } catch (err) {
      console.error("Remove player error:", err);
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  };

  const paidCount = players.filter((p) => p.paid).length;

  return (
    <div className="space-y-4 animate-in">
      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(4, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-4 animate-in"
            style={{ border: '1px solid rgba(255,51,102,0.3)', boxShadow: '0 0 40px rgba(255,51,102,0.1)' }}
          >
            <h2 className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Rimuovi giocatore
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Rimuovere <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{confirmDeleteName}</span> dal gioco?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDeleteId(null); setConfirmDeleteName(""); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm glass transition-all"
                style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)' }}
              >
                Annulla
              </button>
              <button
                onClick={removePlayer}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(255,51,102,0.15))',
                  color: 'var(--wrong)',
                  border: '1px solid rgba(255,51,102,0.4)',
                }}
              >
                Rimuovi
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => { setConfirmDeleteId(p.id); setConfirmDeleteName(p.name); }}
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
