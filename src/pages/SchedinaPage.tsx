import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import MatchCard from "../components/MatchCard";
import type { Game, Match, Player, Sign } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  matches: Match[];
  gameId: string;
}

export default function SchedinaPage({ game, player, matches, gameId }: Props) {
  const [predictions, setPredictions] = useState<Record<string, Sign>>(player.predictions);
  const [saving, setSaving] = useState(false);
  const [topScorerPick, setTopScorerPick] = useState(player.topScorerPick || "");
  const [winnerPick, setWinnerPick] = useState(player.winnerPick || "");

  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);

  const groups = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group ?? m.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const handlePredict = (matchId: string, sign: Sign) => {
    setPredictions((prev) => ({ ...prev, [matchId]: sign }));
  };

  const handleSave = async () => {
    setSaving(true);
    const ref = doc(db, "games", gameId, "players", player.id);
    await updateDoc(ref, { predictions, topScorerPick, winnerPick });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Schedina</h1>
        <p className="text-sm text-slate-400 capitalize">Fase: {game.currentPhase}</p>
      </div>
      {Object.entries(groups).map(([groupName, groupMatches]) => (
        <div key={groupName} className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase">
            {game.currentPhase === "gironi" ? `Gruppo ${groupName}` : groupName}
          </h2>
          {groupMatches.map((match) => (
            <MatchCard key={match.id} match={match} prediction={predictions[match.id] ?? null} onPredict={handlePredict} />
          ))}
        </div>
      ))}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase">Pronostici speciali</h2>
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Capocannoniere</label>
            <input type="text" value={topScorerPick} onChange={(e) => setTopScorerPick(e.target.value)} placeholder="Nome giocatore" className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Vincitrice Mondiale</label>
            <input type="text" value={winnerPick} onChange={(e) => setWinnerPick(e.target.value)} placeholder="Nome squadra" className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold rounded-xl transition-colors">
        {saving ? "SALVATAGGIO..." : "SALVA PRONOSTICI"}
      </button>
      <p className="text-xs text-slate-500 text-center">I pronostici si chiudono 1 ora prima del calcio d'inizio</p>
    </div>
  );
}
