import { useState } from "react";
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Gestione Risultati</h1>
      {Object.entries(groupedByPhase).map(([phase, phaseMatches]) => (
        <div key={phase} className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase">{phase}</h2>
          {phaseMatches.map((match) => (
            <div key={match.id} className="bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">{match.homeTeam} vs {match.awayTeam}</span>
                {match.result && editingId !== match.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{match.score}</span>
                    <span className="px-2 py-1 bg-blue-600 rounded text-xs font-bold">{match.result}</span>
                  </div>
                )}
              </div>
              {editingId === match.id ? (
                <div className="space-y-2">
                  <input type="text" placeholder="Punteggio (es. 2-1)" value={editScore} onChange={(e) => setEditScore(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                  <div className="flex gap-2">
                    {signs.map((s) => (
                      <button key={s} onClick={() => setEditResult(s)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${editResult === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(match.id)} disabled={!editResult} className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-bold">Salva</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Annulla</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditingId(match.id); setEditScore(match.score ?? ""); setEditResult(match.result); }} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs">
                  ✏️ {match.result ? "Correggi" : "Inserisci risultato"}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
