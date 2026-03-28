import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Game, Player, Match } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
  isAdmin: boolean;
  onLogout: () => void;
}

export default function ProfiloPage({ game, player, players, matches, isAdmin, onLogout }: Props) {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "confronto" ? "confronto" : "stats";
  const [tab, setTab] = useState<"stats" | "confronto">(initialTab);
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
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>{player.name}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{player.points} punti totali</p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("stats")}
          className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 glass"
          style={{
            fontFamily: 'Outfit, sans-serif',
            color: tab === "stats" ? 'var(--accent)' : 'var(--text-muted)',
            borderColor: tab === "stats" ? 'var(--accent)' : 'var(--border)',
            boxShadow: tab === "stats" ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          Statistiche
        </button>
        <button
          onClick={() => setTab("confronto")}
          className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 glass"
          style={{
            fontFamily: 'Outfit, sans-serif',
            color: tab === "confronto" ? 'var(--accent)' : 'var(--text-muted)',
            borderColor: tab === "confronto" ? 'var(--accent)' : 'var(--border)',
            boxShadow: tab === "confronto" ? '0 0 12px var(--accent-glow)' : 'none',
          }}
        >
          Confronto
        </button>
      </div>

      {tab === "stats" && (
        <div className="space-y-3">
          {/* Accuracy card */}
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>% Azzecco</p>
            <p className="text-4xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--correct)' }}>{accuracy}%</p>
            <div className="mt-3 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${accuracy}%`, background: 'linear-gradient(90deg, var(--correct), #00cc6a)' }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{correctPredictions} di {finishedMatches.length} pronostici corretti</p>
          </div>

          {/* Group average */}
          <div className="glass rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Media gruppo</p>
            <p className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>{groupAccuracy}%</p>
          </div>

          {/* Special picks */}
          <div className="glass rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Scelte speciali</p>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Capocannoniere</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{player.topScorerPick || "—"}</span>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Vincitrice</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{player.winnerPick || "—"}</span>
            </div>
          </div>
        </div>
      )}

      {tab === "confronto" && (
        <div className="space-y-3">
          {/* Player selector */}
          <select
            value={compareWith}
            onChange={(e) => setCompareWith(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all glass"
            style={{
              color: 'var(--text-primary)',
              borderColor: compareWith ? 'var(--accent)' : 'var(--border)',
              background: 'var(--bg-card)',
            }}
          >
            <option value="" style={{ background: '#0f172a' }}>Seleziona giocatore...</option>
            {players.filter((p) => p.id !== player.id).map((p) => (
              <option key={p.id} value={p.id} style={{ background: '#0f172a' }}>{p.name}</option>
            ))}
          </select>

          {otherPlayer && (
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>
                {player.name} <span style={{ color: 'var(--accent)' }}>vs</span> {otherPlayer.name}
              </p>
              {game.phases.map((phase) => {
                const myPts = getPointsByPhase(player)[phase];
                const theirPts = getPointsByPhase(otherPlayer)[phase];
                if (myPts === 0 && theirPts === 0) return null;
                return (
                  <div key={phase} className="flex justify-between items-center text-sm">
                    <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{phase}</span>
                    <span className="font-bold" style={{ color: myPts > theirPts ? 'var(--correct)' : myPts < theirPts ? 'var(--wrong)' : 'var(--text-muted)' }}>
                      {myPts}–{theirPts}
                    </span>
                  </div>
                );
              })}
              <div className="h-px" style={{ background: 'var(--border)' }} />
              <div className="flex justify-between items-center text-sm font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span>Totale</span>
                <span style={{ color: 'var(--accent)' }}>{player.points}–{otherPlayer.points}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Capocannoniere</span>
                <span style={{ color: 'var(--text-primary)' }}>{player.topScorerPick || "—"} vs {otherPlayer.topScorerPick || "—"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <Link
          to="/admin"
          className="btn-glow block w-full py-3 text-center font-black rounded-xl transition-all"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',
            border: '1px solid rgba(255,215,0,0.4)',
            color: 'var(--gold)',
          }}
        >
          ⚙️ Pannello COMITATO
        </Link>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="glass w-full py-3 font-bold rounded-xl transition-all duration-200 hover:bg-red-600/10"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.875rem',
          color: 'var(--wrong)',
          borderColor: 'rgba(255,51,102,0.4)',
        }}
      >
        Esci
      </button>
    </div>
  );
}
