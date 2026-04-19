import Flag from "./Flag";
import type { Game, Match, Player } from "../lib/types";

interface Props {
  players: Player[];
  matches: Match[];
  game: Game;
  /** Optional player UID to highlight (the viewer themselves). */
  highlightId?: string;
}

const BG_CARD = "rgba(15, 23, 42, 1)";
const BG_DEEP = "#040810";

/**
 * Horizontal-scroll comparison table: rows = phases + total + special picks,
 * columns = the provided players. Sticky first column with metric labels.
 * Used by both the player's Profilo Confronto tab and the admin supervision
 * page.
 */
export default function ComparisonTable({ players, matches, game, highlightId }: Props) {
  if (players.length === 0) {
    return null;
  }

  // Phases for which at least one selected player has non-zero points
  const finishedMatches = matches.filter((m) => m.result !== null);

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

  // Only show phases where at least one player has scored (to avoid rows of zeros)
  const visiblePhases = game.phases.filter((phase) =>
    players.some((p) => pointsByPhase[p.id][phase] > 0)
  );

  // Find max value per row to highlight the leader
  const phaseMax = (phase: string) =>
    Math.max(...players.map((p) => pointsByPhase[p.id][phase]));
  const totalMax = Math.max(...players.map((p) => p.points));

  return (
    <div
      className="glass rounded-xl"
      style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}
    >
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: "100%",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header row: player names */}
        <thead>
          <tr>
            <th
              style={{
                position: "sticky",
                top: 0,
                left: 0,
                zIndex: 30,
                background: BG_CARD,
                borderBottom: "1px solid var(--border)",
                borderRight: "2px solid rgba(0,212,255,0.25)",
                padding: "8px 10px",
                textAlign: "left",
                minWidth: 130,
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="text-[10px] uppercase tracking-widest font-black"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
              >
                Metrica
              </span>
            </th>
            {players.map((p) => {
              const isMe = highlightId === p.id;
              return (
                <th
                  key={p.id}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    background: isMe ? "rgba(0,212,255,0.08)" : BG_CARD,
                    borderBottom: isMe
                      ? "2px solid rgba(0,212,255,0.5)"
                      : "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    padding: "6px 8px",
                    textAlign: "center",
                    minWidth: 72,
                    maxWidth: 100,
                    boxShadow: isMe ? "0 0 12px rgba(0,212,255,0.15)" : "none",
                  }}
                >
                  <div
                    className="text-[11px] font-bold truncate"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      color: isMe ? "var(--accent)" : "var(--text-primary)",
                      maxWidth: 84,
                    }}
                    title={p.name}
                  >
                    {p.name}
                    {isMe && <span className="ml-0.5 text-[8px]">★</span>}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* Phase rows */}
          {visiblePhases.map((phase) => {
            const max = phaseMax(phase);
            return (
              <tr key={phase} style={{ borderBottom: "1px solid var(--border)" }}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    background: BG_DEEP,
                    borderRight: "2px solid rgba(0,212,255,0.25)",
                    borderBottom: "1px solid var(--border)",
                    padding: "6px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    className="text-[11px] font-bold capitalize"
                    style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
                  >
                    {phase}
                  </span>
                </td>
                {players.map((p) => {
                  const pts = pointsByPhase[p.id][phase];
                  const isLeader = pts === max && pts > 0 && players.length > 1;
                  const isMe = highlightId === p.id;
                  return (
                    <td
                      key={p.id}
                      style={{
                        borderRight: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        padding: "6px 8px",
                        textAlign: "center",
                        background: isMe ? "rgba(0,212,255,0.04)" : undefined,
                      }}
                    >
                      <span
                        className="text-xs font-black"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          color: isLeader ? "var(--correct)" : "var(--text-primary)",
                        }}
                      >
                        {pts}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Totale row — always shown */}
          <tr
            style={{
              borderBottom: "2px solid rgba(255,215,0,0.25)",
              borderTop: "2px solid rgba(255,215,0,0.25)",
              background: "rgba(255, 215, 0, 0.04)",
            }}
          >
            <td
              style={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                background: BG_DEEP,
                borderRight: "2px solid rgba(0,212,255,0.25)",
                padding: "8px 10px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="text-xs font-black uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
              >
                Totale
              </span>
            </td>
            {players.map((p) => {
              const isLeader = p.points === totalMax && p.points > 0 && players.length > 1;
              const isMe = highlightId === p.id;
              return (
                <td
                  key={p.id}
                  style={{
                    borderRight: "1px solid var(--border)",
                    padding: "8px 8px",
                    textAlign: "center",
                    background: isMe ? "rgba(0,212,255,0.04)" : undefined,
                  }}
                >
                  <span
                    className="text-sm font-black"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      color: isLeader ? "var(--gold)" : "var(--text-primary)",
                    }}
                  >
                    {p.points}
                    {isLeader && <span className="ml-1 text-[10px]">👑</span>}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Capocannoniere row */}
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td
              style={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                background: BG_DEEP,
                borderRight: "2px solid rgba(0,212,255,0.25)",
                borderBottom: "1px solid var(--border)",
                padding: "6px 10px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="text-[11px] font-bold"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
              >
                ⚽ Capocannoniere
              </span>
            </td>
            {players.map((p) => {
              const isCorrect =
                game.topScorer && p.topScorerPick && p.topScorerPick === game.topScorer;
              const isWrong =
                game.topScorer && p.topScorerPick && p.topScorerPick !== game.topScorer;
              return (
                <td
                  key={p.id}
                  style={{
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    padding: "4px 6px",
                    textAlign: "center",
                    background: isCorrect
                      ? "rgba(0,255,136,0.15)"
                      : isWrong
                      ? "rgba(255,51,102,0.15)"
                      : undefined,
                  }}
                >
                  <span
                    className="text-[11px]"
                    style={{
                      color: isCorrect
                        ? "var(--correct)"
                        : isWrong
                        ? "var(--wrong)"
                        : p.topScorerPick
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                    title={p.topScorerPick}
                  >
                    {p.topScorerPick || "—"}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Vincitrice row */}
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td
              style={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                background: BG_DEEP,
                borderRight: "2px solid rgba(0,212,255,0.25)",
                borderBottom: "1px solid var(--border)",
                padding: "6px 10px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="text-[11px] font-bold"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
              >
                🏆 Vincitrice
              </span>
            </td>
            {players.map((p) => {
              const isCorrect =
                game.winner && p.winnerPick && p.winnerPick === game.winner;
              const isWrong =
                game.winner && p.winnerPick && p.winnerPick !== game.winner;
              return (
                <td
                  key={p.id}
                  style={{
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    padding: "4px 6px",
                    textAlign: "center",
                    background: isCorrect
                      ? "rgba(0,255,136,0.15)"
                      : isWrong
                      ? "rgba(255,51,102,0.15)"
                      : undefined,
                  }}
                >
                  {p.winnerPick ? (
                    <span
                      className="text-[11px] inline-flex items-center gap-1"
                      style={{
                        color: isCorrect
                          ? "var(--correct)"
                          : isWrong
                          ? "var(--wrong)"
                          : "var(--text-primary)",
                      }}
                      title={p.winnerPick}
                    >
                      <Flag team={p.winnerPick} size={10} />
                      <span className="truncate" style={{ maxWidth: 60 }}>
                        {p.winnerPick}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      —
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
