import { useState } from "react";
import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
  isAdmin: boolean;
}

export default function ProfiloPage({ game, player, players, matches, isAdmin }: Props) {
  const [tab, setTab] = useState<"stats" | "confronto">("stats");
  const [compareWith, setCompareWith] = useState<string>("");

  const finishedMatches = matches.filter((m) => m.result !== null);
  const correctPredictions = finishedMatches.filter((m) => player.predictions[m.id] === m.result).length;
  const accuracy = finishedMatches.length > 0 ? Math.round((correctPredictions / finishedMatches.length) * 100) : 0;

  const groupAccuracy = players.length > 0
    ? Math.round(players.reduce((sum, p) => {
        const correct = finishedMatches.filter((m) => p.predictions[m.id] === m.result).length;
        return sum + (finishedMatches.length > 0 ? correct / finishedMatches.length : 0);
      }, 0) / players.length * 100)
    : 0;

  const otherPlayer = players.find((p) => p.id === compareWith);

  const getPointsByPhase = (p: Player) => {
    const result: Record<string, number> = {};
    for (const phase of game.phases) {
      const phaseMatches = finishedMatches.filter((m) => m.phase === phase);
      result[phase] = phaseMatches.filter((m) => p.predictions[m.id] === m.result).length;
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{player.name}</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("stats")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "stats" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Statistiche</button>
        <button onClick={() => setTab("confronto")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "confronto" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Confronto</button>
      </div>

      {tab === "stats" && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">% Azzecco</p>
            <p className="text-3xl font-bold text-green-500">{accuracy}%</p>
            <div className="bg-slate-700 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${accuracy}%` }} />
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Media gruppo</p>
            <p className="text-xl font-bold">{groupAccuracy}%</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 space-y-1">
            <p className="text-xs text-slate-400">Le tue scelte speciali</p>
            <p className="text-sm">Capocannoniere: <span className="font-bold">{player.topScorerPick || "—"}</span></p>
            <p className="text-sm">Vincitrice: <span className="font-bold">{player.winnerPick || "—"}</span></p>
          </div>
        </div>
      )}

      {tab === "confronto" && (
        <div className="space-y-4">
          <select value={compareWith} onChange={(e) => setCompareWith(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
            <option value="">Seleziona giocatore...</option>
            {players.filter((p) => p.id !== player.id).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {otherPlayer && (
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-slate-400">{player.name} vs {otherPlayer.name}</p>
              {game.phases.map((phase) => {
                const myPts = getPointsByPhase(player)[phase];
                const theirPts = getPointsByPhase(otherPlayer)[phase];
                if (myPts === 0 && theirPts === 0) return null;
                return (
                  <div key={phase} className="flex justify-between text-sm">
                    <span className="capitalize">{phase}</span>
                    <span className={myPts > theirPts ? "text-green-500" : myPts < theirPts ? "text-red-500" : "text-slate-400"}>{myPts}-{theirPts}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-2">
                <span>Totale</span>
                <span>{player.points}-{otherPlayer.points}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Capocannoniere</span>
                <span>{player.topScorerPick || "—"} vs {otherPlayer.topScorerPick || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <Link to="/admin" className="block w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white text-center font-bold rounded-xl transition-colors">
          Pannello COMITATO
        </Link>
      )}
    </div>
  );
}
