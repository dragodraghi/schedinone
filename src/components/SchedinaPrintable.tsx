import { forwardRef } from "react";
import type { Game, Match, Player, Sign } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  matches: Match[];
  predictions: Record<string, Sign>;
  topScorerPick: string;
  winnerPick: string;
}

/**
 * Printable / PDF-friendly snapshot of a player's schedina.
 *
 * Renders a clean white-background layout (via `.pdf-export` overrides in
 * index.css) suitable for archiving or sharing outside the app. Laid out
 * as a single long page with match-by-match predictions grouped by girone.
 */
const SchedinaPrintable = forwardRef<HTMLDivElement, Props>(function SchedinaPrintable(
  { game, player, matches, predictions, topScorerPick, winnerPick },
  ref
) {
  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);
  const groups = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group ?? m.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const filledCount = phaseMatches.filter((m) => predictions[m.id]).length;
  const generatedAt = new Date().toLocaleString("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div
      ref={ref}
      style={{
        width: 780,
        padding: "32px 36px",
        background: "#ffffff",
        color: "#040810",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "3px solid #040810",
          paddingBottom: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            SCHEDINONE
          </div>
          <div
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#64748b",
              marginTop: 4,
            }}
          >
            Mondiali 2026
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
            Schedina di
          </div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 22, marginTop: 2 }}>
            {player.name}
          </div>
        </div>
      </div>

      {/* Meta info row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#475569",
          marginBottom: 24,
        }}
      >
        <div>
          <strong style={{ color: "#040810" }}>Fase:</strong> <span style={{ textTransform: "capitalize" }}>{game.currentPhase}</span>
        </div>
        <div>
          <strong style={{ color: "#040810" }}>Pronostici:</strong> {filledCount}/{phaseMatches.length}
        </div>
        <div>
          <strong style={{ color: "#040810" }}>Punti attuali:</strong> {player.points}
        </div>
        <div style={{ marginLeft: "auto" }}>
          Generato il {generatedAt}
        </div>
      </div>

      {/* Groups */}
      {Object.entries(groups).map(([groupName, groupMatches]) => (
        <div key={groupName} style={{ marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#0099cc",
              borderBottom: "2px solid #0099cc",
              paddingBottom: 4,
              marginBottom: 8,
            }}
          >
            {game.currentPhase === "gironi" ? `Gruppo ${groupName}` : groupName}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                <th style={{ textAlign: "left", padding: "4px 6px", width: "32%" }}>Casa</th>
                <th style={{ textAlign: "center", padding: "4px 6px", width: "12%" }}>vs</th>
                <th style={{ textAlign: "left", padding: "4px 6px", width: "32%" }}>Trasferta</th>
                <th style={{ textAlign: "center", padding: "4px 6px", width: "10%" }}>Pronostico</th>
                <th style={{ textAlign: "center", padding: "4px 6px", width: "14%" }}>Risultato</th>
              </tr>
            </thead>
            <tbody>
              {groupMatches.map((match) => {
                const pred = predictions[match.id];
                const result = match.result;
                const correct = result && pred === result;
                const wrong = result && pred && pred !== result;
                return (
                  <tr key={match.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px", fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>
                      {match.homeTeam}
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", color: "#64748b", fontSize: 10 }}>
                      {match.kickoff
                        ? match.kickoff.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
                        : "—"}
                    </td>
                    <td style={{ padding: "6px", fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>
                      {match.awayTeam}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "center",
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 800,
                        fontSize: 14,
                        color: correct ? "#008a4a" : wrong ? "#c11f44" : "#0099cc",
                      }}
                    >
                      {pred ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "center",
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 700,
                        color: "#040810",
                      }}
                    >
                      {result ? (
                        <>
                          <span>{match.score ?? result}</span>
                          <span
                            style={{
                              display: "inline-block",
                              marginLeft: 6,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: correct ? "#d1fae5" : "#fee2e2",
                              color: correct ? "#008a4a" : "#c11f44",
                              fontSize: 10,
                            }}
                          >
                            {correct ? "✓" : "✗"}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Special picks */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "2px solid #b8860b",
          borderRadius: 8,
          background: "#fffbeb",
        }}
      >
        <div
          style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#b8860b",
            marginBottom: 8,
          }}
        >
          Pronostici speciali (premi in denaro separati)
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>⚽ Capocannoniere</div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, marginTop: 2, fontSize: 16 }}>
              {topScorerPick || "—"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>🏆 Squadra Vincitrice</div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, marginTop: 2, fontSize: 16 }}>
              {winnerPick || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 12,
          borderTop: "1px solid #e2e8f0",
          fontSize: 10,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        schedinone-2026.web.app · FIFA World Cup 2026 — USA · Messico · Canada
      </div>
    </div>
  );
});

export default SchedinaPrintable;
