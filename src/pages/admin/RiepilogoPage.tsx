import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../../lib/types";
import { getFlag } from "../../lib/flags";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
  currentPlayer?: Player;
}

// Solid background colors for sticky cells (no transparency bleed-through)
const BG_DEEP = "#040810";
const BG_CARD = "rgba(15, 23, 42, 1)"; // opaque version of --bg-card

export default function RiepilogoPage({ game, players, matches, currentPlayer }: Props) {
  const [groupFilter, setGroupFilter] = useState<string>("Tutti");

  const isPlayerView = !!currentPlayer;

  // Collect unique groups from gironi matches
  const groups = useMemo(() => {
    const seen = new Set<string>();
    matches
      .filter((m) => m.phase === "gironi" && m.group)
      .forEach((m) => seen.add(m.group!));
    return Array.from(seen).sort();
  }, [matches]);

  // Only show accepted players when accessed from player view; admin sees all
  const visiblePlayers = useMemo(() => {
    if (isPlayerView) {
      return players.filter((p) => p.scheduleStatus === "accettata");
    }
    return players;
  }, [players, isPlayerView]);

  // Sort players by points descending
  const sortedPlayers = useMemo(
    () => [...visiblePlayers].sort((a, b) => b.points - a.points),
    [visiblePlayers]
  );

  // Group matches by group (gironi) then others
  const giorniMatches = useMemo(
    () => matches.filter((m) => m.phase === "gironi"),
    [matches]
  );

  // Filtered gironi matches based on active filter
  const filteredGironiMatches = useMemo(() => {
    if (groupFilter === "Tutti") return giorniMatches;
    return giorniMatches.filter((m) => m.group === groupFilter);
  }, [giorniMatches, groupFilter]);

  // Group filtered matches by group letter
  const matchesByGroup = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    filteredGironiMatches.forEach((m) => {
      const g = m.group ?? "?";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    });
    // Sort within each group by kickoff
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => (a.kickoff?.getTime?.() ?? 0) - (b.kickoff?.getTime?.() ?? 0)));
    return grouped;
  }, [filteredGironiMatches]);

  const sortedGroupKeys = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup]);

  // Cell color based on prediction state
  function cellStyle(player: Player, match: Match): React.CSSProperties {
    const prediction = player.predictions[match.id];
    if (!prediction) return {};
    if (!match.result) {
      // Pending: prediction placed, match not yet played
      return { background: "rgba(0, 212, 255, 0.12)" };
    }
    if (prediction === match.result) {
      // Correct
      return { background: "rgba(0, 255, 136, 0.15)" };
    }
    // Wrong
    return { background: "rgba(255, 51, 102, 0.15)" };
  }

  function cellText(player: Player, match: Match): { text: string; color: string } {
    const prediction = player.predictions[match.id];
    if (!prediction) return { text: "—", color: "var(--text-muted)" };
    if (!match.result) return { text: prediction, color: "var(--accent)" };
    if (prediction === match.result) return { text: prediction, color: "var(--correct)" };
    return { text: prediction, color: "var(--wrong)" };
  }

  const totalCols = 2 + sortedPlayers.length; // match col + result col + players

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            {isPlayerView ? "📊 Griglione" : "📊 Riepilogo Schedine"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sortedPlayers.length} giocatori · {matches.length} partite
          </p>
        </div>
        <Link
          to={isPlayerView ? "/" : "/admin"}
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass"
          style={{ color: "var(--text-muted)" }}
        >
          {isPlayerView ? "← Home" : "← Admin"}
        </Link>
      </div>

      {/* Group filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {["Tutti", ...groups].map((g) => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{
              fontFamily: "Outfit, sans-serif",
              background:
                groupFilter === g
                  ? "rgba(0, 212, 255, 0.2)"
                  : "rgba(255, 255, 255, 0.05)",
              color: groupFilter === g ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${groupFilter === g ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
              boxShadow: groupFilter === g ? "0 0 8px rgba(0,212,255,0.25)" : "none",
            }}
          >
            {g === "Tutti" ? "Tutti" : `Gr. ${g}`}
          </button>
        ))}
      </div>

      {/* Scrollable grid */}
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
          {/* Sticky header row */}
          <thead>
            <tr>
              {/* Column 1: "Partita" */}
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 30,
                  background: BG_CARD,
                  borderBottom: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  padding: "8px 10px",
                  textAlign: "left",
                  minWidth: 140,
                  maxWidth: 180,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
                >
                  Partita
                </span>
              </th>
              {/* Column 2: "Ris." */}
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 140,
                  zIndex: 30,
                  background: BG_CARD,
                  borderBottom: "1px solid var(--border)",
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  padding: "8px 8px",
                  textAlign: "center",
                  minWidth: 44,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
                >
                  Ris.
                </span>
              </th>
              {/* One column per player */}
              {sortedPlayers.map((player) => {
                const isMe = currentPlayer?.id === player.id;
                return (
                  <th
                    key={player.id}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 20,
                      background: isMe ? "rgba(0,212,255,0.08)" : BG_CARD,
                      borderBottom: isMe ? "2px solid rgba(0,212,255,0.5)" : "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      padding: "6px 6px",
                      textAlign: "center",
                      minWidth: 52,
                      maxWidth: 72,
                      boxShadow: isMe ? "0 0 12px rgba(0,212,255,0.15)" : "none",
                    }}
                  >
                    <div
                      className="text-[11px] font-bold truncate"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        color: isMe ? "var(--accent)" : "var(--text-primary)",
                        maxWidth: 64,
                      }}
                      title={player.name}
                    >
                      {player.name.split(" ")[0]}
                      {isMe && <span className="ml-0.5 text-[8px]">★</span>}
                    </div>
                    <div
                      className="text-[10px] font-black"
                      style={{ color: "var(--gold)" }}
                    >
                      {player.points}pt
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedGroupKeys.map((groupKey) => (
              <React.Fragment key={groupKey}>
                {/* Group header row */}
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{
                      background: "rgba(0, 212, 255, 0.06)",
                      borderBottom: "1px solid rgba(0,212,255,0.15)",
                      borderTop: "1px solid rgba(0,212,255,0.15)",
                      padding: "5px 12px",
                    }}
                  >
                    <span
                      className="group-header text-[10px] uppercase tracking-widest"
                      style={{ color: "var(--accent)" }}
                    >
                      GRUPPO {groupKey}
                    </span>
                  </td>
                </tr>

                {/* Match rows for this group */}
                {matchesByGroup[groupKey].map((match) => (
                  <tr
                    key={match.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    {/* Sticky: match name */}
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 10,
                        background: BG_DEEP,
                        borderRight: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        padding: "5px 10px",
                        minWidth: 140,
                        maxWidth: 180,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        className="text-[11px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {getFlag(match.homeTeam)}{" "}
                        <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 10 }}>
                          {match.homeTeam}
                        </span>
                      </div>
                      <div
                        className="text-[11px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {getFlag(match.awayTeam)}{" "}
                        <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 10 }}>
                          {match.awayTeam}
                        </span>
                      </div>
                    </td>

                    {/* Sticky: result */}
                    <td
                      style={{
                        position: "sticky",
                        left: 140,
                        zIndex: 10,
                        background: BG_DEEP,
                        borderRight: "2px solid rgba(0,212,255,0.25)",
                        borderBottom: "1px solid var(--border)",
                        padding: "5px 8px",
                        textAlign: "center",
                        minWidth: 44,
                      }}
                    >
                      {match.result ? (
                        <span
                          className="text-xs font-black"
                          style={{
                            fontFamily: "Outfit, sans-serif",
                            color: "var(--accent)",
                            background: "rgba(0,212,255,0.12)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {match.result}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* One cell per player */}
                    {sortedPlayers.map((player) => {
                      const { text, color } = cellText(player, match);
                      const style = cellStyle(player, match);
                      const isMe = currentPlayer?.id === player.id;
                      return (
                        <td
                          key={player.id}
                          style={{
                            ...style,
                            borderRight: "1px solid var(--border)",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: isMe ? "1px solid rgba(0,212,255,0.3)" : undefined,
                            padding: "4px 6px",
                            textAlign: "center",
                            minWidth: 52,
                            background: isMe && !style.background ? "rgba(0,212,255,0.04)" : style.background,
                          }}
                        >
                          <span
                            className="text-xs font-black"
                            style={{ fontFamily: "Outfit, sans-serif", color }}
                          >
                            {text}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Special rows: Capocannoniere + Vincitrice */}
            {/* Separator */}
            <tr>
              <td
                colSpan={totalCols}
                style={{
                  background: "rgba(255, 215, 0, 0.06)",
                  borderBottom: "1px solid rgba(255,215,0,0.2)",
                  borderTop: "2px solid rgba(255,215,0,0.25)",
                  padding: "5px 12px",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  Pronostici Speciali
                </span>
              </td>
            </tr>

            {/* Capocannoniere row */}
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "6px 10px",
                  minWidth: 140,
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  className="text-[11px] font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  ⚽ Capocannoniere
                </div>
                {game.topScorer && (
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Risposta: {game.topScorer}
                  </div>
                )}
              </td>
              {/* Result cell */}
              <td
                style={{
                  position: "sticky",
                  left: 140,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  borderBottom: "1px solid var(--border)",
                  padding: "5px 8px",
                  textAlign: "center",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
              </td>
              {sortedPlayers.map((player) => {
                const pick = player.topScorerPick || "—";
                const isCorrect = game.topScorer && player.topScorerPick && player.topScorerPick === game.topScorer;
                const isWrong = game.topScorer && player.topScorerPick && player.topScorerPick !== game.topScorer;
                const bgStyle = isCorrect
                  ? { background: "rgba(0,255,136,0.15)" }
                  : isWrong
                  ? { background: "rgba(255,51,102,0.15)" }
                  : {};
                const color = isCorrect
                  ? "var(--correct)"
                  : isWrong
                  ? "var(--wrong)"
                  : pick === "—"
                  ? "var(--text-muted)"
                  : "var(--text-primary)";
                return (
                  <td
                    key={player.id}
                    style={{
                      ...bgStyle,
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      padding: "4px 4px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium"
                      style={{ color }}
                      title={pick}
                    >
                      {pick.length > 8 ? pick.slice(0, 7) + "…" : pick}
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
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "6px 10px",
                  minWidth: 140,
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  className="text-[11px] font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  🏆 Vincitrice
                </div>
                {game.winner && (
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {getFlag(game.winner)} {game.winner}
                  </div>
                )}
              </td>
              {/* Result cell */}
              <td
                style={{
                  position: "sticky",
                  left: 140,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  borderBottom: "1px solid var(--border)",
                  padding: "5px 8px",
                  textAlign: "center",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
              </td>
              {sortedPlayers.map((player) => {
                const pick = player.winnerPick || "—";
                const isCorrect = game.winner && player.winnerPick && player.winnerPick === game.winner;
                const isWrong = game.winner && player.winnerPick && player.winnerPick !== game.winner;
                const bgStyle = isCorrect
                  ? { background: "rgba(0,255,136,0.15)" }
                  : isWrong
                  ? { background: "rgba(255,51,102,0.15)" }
                  : {};
                const color = isCorrect
                  ? "var(--correct)"
                  : isWrong
                  ? "var(--wrong)"
                  : pick === "—"
                  ? "var(--text-muted)"
                  : "var(--text-primary)";
                return (
                  <td
                    key={player.id}
                    style={{
                      ...bgStyle,
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      padding: "4px 4px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium"
                      style={{ color }}
                      title={pick}
                    >
                      {pick === "—"
                        ? "—"
                        : `${getFlag(pick)} ${pick.length > 6 ? pick.slice(0, 5) + "…" : pick}`}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
