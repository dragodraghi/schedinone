import { useState } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Match, Sign } from "../../lib/types";

interface Props {
  matches: Match[];
  gameId: string;
}

const signs: Sign[] = ["1", "X", "2"];

export default function RisultatiPage({ matches, gameId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editResult, setEditResult] = useState<Sign | null>(null);

  const handleSave = async (matchId: string) => {
    const ref = doc(db, "games", gameId, "matches", matchId);
    await updateDoc(ref, { result: editResult, score: editScore, resultSource: "manual" });
    setEditingId(null);
  };

  const groupedByPhase = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = [];
    acc[m.phase].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Gestione Risultati</h1>

      <Link to="/admin" className="block text-center text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
        ← Admin
      </Link>

      {Object.entries(groupedByPhase).map(([phase, phaseMatches]) => (
        <div key={phase} className="space-y-2">
          <h2
            className="group-header text-[11px] uppercase tracking-wider"
            style={{ color: 'var(--accent)' }}
          >
            {phase}
          </h2>
          {phaseMatches.map((match) => (
            <div key={match.id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {match.homeTeam} vs {match.awayTeam}
                </span>
                {match.result && editingId !== match.id && (
                  <div className="flex items-center gap-2">
                    {match.score && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{match.score}</span>
                    )}
                    <span
                      className="px-2 py-1 rounded text-xs font-black"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: 'rgba(0, 212, 255, 0.15)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                      }}
                    >
                      {match.result}
                    </span>
                  </div>
                )}
              </div>

              {editingId === match.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Punteggio (es. 2-1)"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                  <div className="flex gap-2">
                    {signs.map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditResult(s)}
                        className="flex-1 py-2 rounded-lg text-sm font-black transition-all"
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          background: editResult === s ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                          color: editResult === s ? 'var(--accent)' : 'var(--text-muted)',
                          border: `1px solid ${editResult === s ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                          boxShadow: editResult === s ? '0 0 12px var(--accent-glow)' : 'none',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(match.id)}
                      disabled={!editResult}
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: editResult ? 'linear-gradient(135deg, var(--correct), #00cc6a)' : 'rgba(255,255,255,0.05)',
                        color: editResult ? '#040810' : 'var(--text-muted)',
                        opacity: editResult ? 1 : 0.5,
                        cursor: editResult ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-2 rounded-lg text-sm transition-all glass hover:bg-white/5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingId(match.id); setEditScore(match.score ?? ""); setEditResult(match.result); }}
                  className="w-full py-2 rounded-lg text-xs transition-all glass hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✏️ {match.result ? "Correggi risultato" : "Inserisci risultato"}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
