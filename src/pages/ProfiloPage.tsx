import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Flag from "../components/Flag";
import ComparisonTable from "../components/ComparisonTable";
import InviteButton from "../components/InviteButton";
import { computePlayerStats } from "../lib/playerStats";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stats = computePlayerStats(player, matches);
  const finishedMatches = matches.filter((m) => m.result !== null);
  const correctPredictions = stats.correct;
  const accuracy = stats.accuracy;

  const acceptedPlayers = players.filter((p) => p.scheduleStatus === "accettata");
  const groupAccuracy = acceptedPlayers.length > 0
    ? Math.round(acceptedPlayers.reduce((sum, p) => {
        const correct = finishedMatches.filter((m) => p.predictions[m.id] === m.result).length;
        return sum + (finishedMatches.length > 0 ? correct / finishedMatches.length : 0);
      }, 0) / acceptedPlayers.length * 100)
    : 0;

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Comparison list = current player always first, then every selected opponent
  const comparisonPlayers = [
    player,
    ...players.filter((p) => p.id !== player.id && selectedIds.has(p.id)),
  ];
  const opponents = players.filter((p) => p.id !== player.id);

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

          {/* Streak + Best day — only shown once at least one match has finished */}
          {stats.finished > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
                  🔥 Serie attiva
                </p>
                <p className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: stats.currentStreak > 0 ? 'var(--correct)' : 'var(--text-muted)' }}>
                  {stats.currentStreak}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  consecutivi
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
                  ⚡ Record
                </p>
                <p className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
                  {stats.longestStreak}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  miglior serie
                </p>
              </div>
            </div>
          )}

          {stats.bestDay && (
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
                🏅 Giornata migliore
              </p>
              <p className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span style={{ color: 'var(--correct)' }}>{stats.bestDay.correct}/{stats.bestDay.total}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>pronostici azzeccati</span>
              </p>
              <p className="text-xs mt-1 capitalize" style={{ color: 'var(--text-muted)' }}>
                {stats.bestDay.date.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            </div>
          )}

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
              <span className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                {player.winnerPick ? (<><Flag team={player.winnerPick} size={12} />{player.winnerPick}</>) : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === "confronto" && (
        <div className="space-y-3">
          {opponents.length === 0 ? (
            <EmptyState
              icon="⚔️"
              title="Ancora nessun avversario"
              description="Quando altri giocatori si iscriveranno potrai confrontarti con loro."
              accent="muted"
            />
          ) : (
            <>
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p
                    className="text-[10px] uppercase tracking-wider"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    Scegli avversari ({selectedIds.size} selezionat{selectedIds.size === 1 ? "o" : "i"})
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set(opponents.map((p) => p.id)))}
                      className="text-[10px] font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      Tutti
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[10px] font-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Nessuno
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opponents.map((p) => {
                    const active = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlayer(p.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          background: active
                            ? "rgba(0, 212, 255, 0.2)"
                            : "rgba(255, 255, 255, 0.05)",
                          color: active ? "var(--accent)" : "var(--text-muted)",
                          border: `1px solid ${active ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                          boxShadow: active ? "0 0 8px rgba(0,212,255,0.25)" : "none",
                        }}
                      >
                        {active && "✓ "}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedIds.size === 0 ? (
                <EmptyState
                  icon="⚔️"
                  title="Seleziona uno o piu' avversari"
                  description="Tocca i nomi sopra per costruire il confronto. Puoi confrontarti con quanti vuoi."
                  accent="blue"
                />
              ) : (
                <ComparisonTable
                  players={comparisonPlayers}
                  matches={matches}
                  game={game}
                  highlightId={player.id}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Invite friends — admin-only (the Comitato is in charge of who joins) */}
      {isAdmin && <InviteButton accessCode={game.accessCode} />}

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
