import Flag from "./Flag";
import type { Game, Match, Player } from "../lib/types";

interface Props {
  players: Player[];
  matches: Match[];
  game: Game;
  /** Optional player UID to highlight (the viewer themselves). */
  highlightId?: string;
}

/**
 * Vertical stack of player cards — one per selected player, easy to scroll
 * on mobile (no horizontal overflow). Each card shows points per phase,
 * total, and special picks. "Leader" value per metric is highlighted with
 * a crown emoji.
 */
export default function ComparisonTable({ players, matches, game, highlightId }: Props) {
  if (players.length === 0) return null;

  const finishedMatches = matches.filter((m) => m.result !== null);

  // Precompute points per phase for each player
  const pointsByPhase: Record<string, Record<string, number>> = {};
  for (const p of players) {
    pointsByPhase[p.id] = {};
    for (const phase of game.phases) {
      const phaseMatches = finishedMatches.filter((m) => m.phase === phase);
      pointsByPhase[p.id][phase] = phaseMatches.filter(
        (m) => p.predictions[m.id] === m.result
      ).length;
    }
  }

  // Only show phases where at least one player scored
  const visiblePhases = game.phases.filter((phase) =>
    players.some((p) => pointsByPhase[p.id][phase] > 0)
  );

  // Max value per metric → used to mark the leader
  const phaseMax: Record<string, number> = {};
  for (const phase of game.phases) {
    phaseMax[phase] = Math.max(...players.map((p) => pointsByPhase[p.id][phase]));
  }
  const totalMax = Math.max(...players.map((p) => p.points));

  // Sort players by points descending so the best is on top
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-3">
      {sorted.map((p, idx) => {
        const isMe = highlightId === p.id;
        const isTotalLeader = p.points === totalMax && p.points > 0 && players.length > 1;
        const rank = idx + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

        const hasCorrectScorer =
          game.topScorer && p.topScorerPick === game.topScorer;
        const hasWrongScorer =
          game.topScorer && p.topScorerPick && p.topScorerPick !== game.topScorer;
        const hasCorrectWinner =
          game.winner && p.winnerPick === game.winner;
        const hasWrongWinner =
          game.winner && p.winnerPick && p.winnerPick !== game.winner;

        return (
          <div
            key={p.id}
            className="glass rounded-xl p-4 space-y-2.5"
            style={{
              borderColor: isMe ? "rgba(0,212,255,0.4)" : "var(--border)",
              boxShadow: isMe ? "0 0 16px rgba(0,212,255,0.12)" : "none",
              background: isMe ? "rgba(0,212,255,0.04)" : undefined,
            }}
          >
            {/* Header: name + total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0" aria-hidden="true">
                  {medal ?? <span style={{ color: "var(--text-muted)", fontSize: 14 }}>#{rank}</span>}
                </span>
                <h3
                  className="text-base font-black truncate"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: isMe ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {p.name}
                  {isMe && <span className="ml-1 text-[10px]">★ TU</span>}
                </h3>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                {isTotalLeader && <span className="text-sm">👑</span>}
                <span
                  className="text-2xl font-black"
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    color: isTotalLeader ? "var(--gold)" : "var(--text-primary)",
                  }}
                >
                  {p.points}
                </span>
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  pt
                </span>
              </div>
            </div>

            {/* Phase breakdown — only shown if some phase has data */}
            {visiblePhases.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {visiblePhases.map((phase) => {
                  const pts = pointsByPhase[p.id][phase];
                  const isLeader =
                    pts === phaseMax[phase] && pts > 0 && players.length > 1;
                  return (
                    <div
                      key={phase}
                      className="rounded-lg px-2.5 py-1 flex items-baseline gap-1.5"
                      style={{
                        background: isLeader
                          ? "rgba(0,255,136,0.1)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${
                          isLeader ? "rgba(0,255,136,0.3)" : "var(--border)"
                        }`,
                      }}
                    >
                      <span
                        className="text-[10px] capitalize"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {phase}
                      </span>
                      <span
                        className="text-xs font-black"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          color: isLeader
                            ? "var(--correct)"
                            : "var(--text-primary)",
                        }}
                      >
                        {pts}
                        {isLeader && " 👑"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Special picks */}
            <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-muted)" }}>⚽ Capocannoniere</span>
                <span
                  className="font-bold truncate ml-2"
                  style={{
                    color: hasCorrectScorer
                      ? "var(--correct)"
                      : hasWrongScorer
                      ? "var(--wrong)"
                      : p.topScorerPick
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    maxWidth: "60%",
                  }}
                  title={p.topScorerPick}
                >
                  {p.topScorerPick || "—"}
                  {hasCorrectScorer && " ✓"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span style={{ color: "var(--text-muted)" }}>🏆 Vincitrice</span>
                <span
                  className="font-bold inline-flex items-center gap-1.5 truncate"
                  style={{
                    color: hasCorrectWinner
                      ? "var(--correct)"
                      : hasWrongWinner
                      ? "var(--wrong)"
                      : p.winnerPick
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    maxWidth: "60%",
                  }}
                  title={p.winnerPick}
                >
                  {p.winnerPick ? (
                    <>
                      <Flag team={p.winnerPick} size={12} />
                      <span className="truncate">{p.winnerPick}</span>
                      {hasCorrectWinner && " ✓"}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
