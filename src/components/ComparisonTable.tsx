import Flag from "./Flag";
import { rankPlayersForLeaderboard } from "../lib/playerOrdering";
import type { Game, Match, Phase, Player, Sign } from "../lib/types";

interface Props {
  players: Player[];
  matches: Match[];
  game: Game;
  /** Optional player UID to highlight (the viewer themselves). */
  highlightId?: string;
}

const phaseLabels: Record<Phase, string> = {
  gironi: "Gironi",
  ottavi: "Ottavi",
  quarti: "Quarti",
  semifinali: "Semifinali",
  finale: "Finale",
};

function matchLabel(match: Match): string {
  return `${match.homeTeam} - ${match.awayTeam}`;
}

function sortMatchesForComparison(matches: Match[], phases: Phase[]): Match[] {
  const phaseOrder = new Map(phases.map((phase, index) => [phase, index]));
  return [...matches].sort((a, b) => {
    const phaseDiff = (phaseOrder.get(a.phase) ?? 999) - (phaseOrder.get(b.phase) ?? 999);
    if (phaseDiff !== 0) return phaseDiff;

    const timeDiff = a.kickoff.getTime() - b.kickoff.getTime();
    if (Number.isFinite(timeDiff) && timeDiff !== 0) return timeDiff;

    return a.id.localeCompare(b.id);
  });
}

function predictionColor(match: Match, prediction: Sign | undefined): string {
  if (!prediction) return "var(--text-muted)";
  if (!match.result) return "var(--text-primary)";
  return prediction === match.result ? "var(--correct)" : "var(--wrong)";
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

  const rankedPlayers = rankPlayersForLeaderboard(players);
  const rankedComparisonPlayers = rankedPlayers.map(({ player }) => player);
  const scheduleMatches = sortMatchesForComparison(matches, game.phases);

  return (
    <div className="space-y-3">
      {scheduleMatches.length > 0 && (
        <section
          className="glass rounded-xl p-4 space-y-3"
          aria-label="Schedina partita per partita"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-sm font-black"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}
              >
                Schedina partita per partita
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {scheduleMatches.length} partite, {players.length} giocatori selezionati
              </p>
            </div>
            <span
              className="rounded-lg px-2 py-1 text-[10px] font-black shrink-0"
              style={{
                color: "var(--accent)",
                background: "rgba(0, 212, 255, 0.08)",
                border: "1px solid rgba(0, 212, 255, 0.22)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              1 / X / 2
            </span>
          </div>

          <div
            className="rounded-xl border"
            style={{
              borderColor: "var(--border)",
              maxHeight: "64vh",
              overflow: "auto",
            }}
          >
            <table
              className="w-full border-collapse text-xs"
              style={{
                minWidth: Math.max(560, 270 + rankedComparisonPlayers.length * 58),
              }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 px-2 py-2 text-left"
                    style={{
                      background: "rgba(4, 8, 16, 0.96)",
                      color: "var(--text-muted)",
                      fontFamily: "Outfit, sans-serif",
                      width: 210,
                    }}
                  >
                    Partita
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 px-2 py-2 text-center"
                    style={{
                      background: "rgba(4, 8, 16, 0.96)",
                      color: "var(--text-muted)",
                      fontFamily: "Outfit, sans-serif",
                      width: 54,
                    }}
                  >
                    Ris.
                  </th>
                  {rankedComparisonPlayers.map((player) => (
                    <th
                      key={player.id}
                      scope="col"
                      className="sticky top-0 z-10 px-1.5 py-2 text-center"
                      style={{
                        background: "rgba(4, 8, 16, 0.96)",
                        color: "var(--text-muted)",
                        fontFamily: "Outfit, sans-serif",
                        width: 58,
                      }}
                      title={player.name}
                    >
                      <span className="block truncate">{player.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleMatches.map((match, index) => {
                  const label = matchLabel(match);
                  const resultText = match.result ?? "-";
                  const resultTitle = match.result
                    ? `Risultato: ${match.result}${match.score ? ` (${match.score})` : ""}`
                    : "Risultato non inserito";
                  return (
                    <tr key={match.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <th scope="row" className="px-2 py-2 text-left align-middle">
                        <span
                          className="block truncate font-black"
                          style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}
                          title={label}
                        >
                          {label}
                        </span>
                        <span
                          className="block text-[10px] uppercase tracking-wider"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {match.group ? `Girone ${match.group}` : phaseLabels[match.phase]} - partita {index + 1}
                        </span>
                      </th>
                      <td
                        className="px-2 py-2 text-center align-middle font-black"
                        style={{ color: match.result ? "var(--gold)" : "var(--text-muted)" }}
                        title={resultTitle}
                      >
                        {resultText}
                      </td>
                      {rankedComparisonPlayers.map((player) => {
                        const prediction = player.predictions[match.id];
                        const isCorrect = prediction && match.result && prediction === match.result;
                        const isWrong = prediction && match.result && prediction !== match.result;
                        return (
                          <td
                            key={`${match.id}-${player.id}`}
                            className="px-1.5 py-2 text-center align-middle"
                            style={{
                              background: isCorrect
                                ? "rgba(0,255,136,0.08)"
                                : isWrong
                                ? "rgba(255,51,102,0.08)"
                                : "transparent",
                            }}
                          >
                            <span
                              aria-label={`Pronostico ${player.name} per ${label}`}
                              className="inline-flex h-6 min-w-6 items-center justify-center rounded-md font-black"
                              style={{
                                fontFamily: "Outfit, sans-serif",
                                color: predictionColor(match, prediction),
                                border: `1px solid ${
                                  isCorrect
                                    ? "rgba(0,255,136,0.28)"
                                    : isWrong
                                    ? "rgba(255,51,102,0.28)"
                                    : "var(--border)"
                                }`,
                                background: "rgba(255,255,255,0.04)",
                              }}
                              title={prediction ?? "Mancante"}
                            >
                              {prediction ?? "-"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rankedPlayers.map(({ player: p, rank }) => {
        const isMe = highlightId === p.id;
        const isTotalLeader = p.points === totalMax && p.points > 0 && players.length > 1;
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
