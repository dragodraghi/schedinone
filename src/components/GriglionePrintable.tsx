import { forwardRef } from "react";
import type { Game, Match, Player } from "../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
}

export interface GriglionePdfLayout {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  format: [number, number];
  orientation: "landscape";
}

const MM_TO_PX = 96 / 25.4;
const PAGE_PADDING_MM = 5;
const MATCH_COL_MM = 58;
const PLAYER_COL_MM = 10.5;
const TOP_HEADER_MM = 24;
const TABLE_HEADER_MM = 43;
const ROW_MM = 3.8;
const SPECIAL_ROW_MM = 5.6;
const FOOTER_MM = 10;
const MIN_LANDSCAPE_RATIO = 1.08;
const CLASSIC = {
  paper: "#ffffff",
  ink: "#111827",
  muted: "#64748b",
  header: "#1f2937",
  line: "#cbd5e1",
  strongLine: "#334155",
  rowAlt: "#f8fafc",
  special: "#f1f5f9",
  rule: "#e2e8f0",
};

function roundMm(value: number): number {
  return Math.ceil(value * 10) / 10;
}

function mmToPx(value: number): number {
  return Math.ceil(value * MM_TO_PX);
}

export function calculateGriglionePdfLayout(playerCount: number, matchCount: number): GriglionePdfLayout {
  const naturalWidthMm = PAGE_PADDING_MM * 2 + MATCH_COL_MM + Math.max(playerCount, 1) * PLAYER_COL_MM;
  const heightMm =
    PAGE_PADDING_MM * 2 +
    TOP_HEADER_MM +
    TABLE_HEADER_MM +
    matchCount * ROW_MM +
    SPECIAL_ROW_MM * 2 +
    FOOTER_MM;
  const widthMm = Math.max(naturalWidthMm, heightMm * MIN_LANDSCAPE_RATIO);
  const roundedWidthMm = roundMm(widthMm);
  const roundedHeightMm = roundMm(heightMm);

  return {
    widthMm: roundedWidthMm,
    heightMm: roundedHeightMm,
    widthPx: mmToPx(roundedWidthMm),
    heightPx: mmToPx(roundedHeightMm),
    format: [roundedWidthMm, roundedHeightMm],
    orientation: "landscape",
  };
}

function pickText(value: string | undefined): string {
  return value?.trim() || "";
}

function matchLabel(match: Match): string {
  return `${match.homeTeam} - ${match.awayTeam}`;
}

function formatDate(value: Date): string {
  return value.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GriglionePrintable = forwardRef<HTMLDivElement, Props>(function GriglionePrintable(
  { game, players, matches },
  ref
) {
  const layout = calculateGriglionePdfLayout(players.length, matches.length);
  const tableHeaderPx = mmToPx(TABLE_HEADER_MM);
  const generatedAt = new Date().toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div
      ref={ref}
      data-griglione-print="true"
      data-palette="classic-clean"
      style={{
        width: layout.widthPx,
        minHeight: layout.heightPx,
        padding: mmToPx(PAGE_PADDING_MM),
        boxSizing: "border-box",
        background: CLASSIC.paper,
        color: CLASSIC.ink,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: mmToPx(18),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: CLASSIC.ink,
          opacity: 0.035,
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: 8,
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        WORLD CUP 2026
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "end",
            borderBottom: `2px solid ${CLASSIC.strongLine}`,
            paddingBottom: 8,
            marginBottom: 8,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "Georgia, serif",
                fontSize: 31,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              The Big Pool - La Gran Quiniela - Le Grand Pool 2026
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              Griglione Mondiali 2026 - USA - Messico - Canada
            </p>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textAlign: "right",
              lineHeight: 1.2,
            }}
          >
            <div>{players.length} squadre</div>
            <div>{matches.length} partite</div>
          </div>
        </header>

        <div
          style={{
            height: 5,
            marginBottom: 8,
            background: CLASSIC.rule,
            borderTop: `1px solid ${CLASSIC.line}`,
            borderBottom: `1px solid ${CLASSIC.line}`,
          }}
        />

        <table
          aria-label="Griglione Schedinone"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: 8,
            background: CLASSIC.paper,
          }}
        >
          <colgroup>
            <col style={{ width: mmToPx(MATCH_COL_MM) }} />
            {players.map((player) => (
              <col key={player.id} style={{ width: mmToPx(PLAYER_COL_MM) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="griglione-dark-cell"
                style={{
                  height: tableHeaderPx,
                  border: `1px solid ${CLASSIC.strongLine}`,
                  background: CLASSIC.header,
                  color: CLASSIC.paper,
                  textAlign: "left",
                  padding: "4px 5px",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Partite
              </th>
              {players.map((player) => (
                <th
                  key={player.id}
                  scope="col"
                  className="griglione-dark-cell"
                  style={{
                    height: tableHeaderPx,
                    border: `1px solid ${CLASSIC.strongLine}`,
                    background: CLASSIC.header,
                    color: CLASSIC.paper,
                    padding: 2,
                    verticalAlign: "bottom",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: tableHeaderPx - 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      fontSize: 6.8,
                      lineHeight: 1,
                      fontWeight: 800,
                    }}
                  >
                    {player.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr key={match.id} style={{ height: mmToPx(ROW_MM), background: index % 2 ? CLASSIC.rowAlt : CLASSIC.paper }}>
                <th
                  scope="row"
                  style={{
                    border: `1px solid ${CLASSIC.line}`,
                    padding: "1px 4px",
                    textAlign: "left",
                    fontSize: 7.6,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  <span>{matchLabel(match)}</span>
                  <span className="griglione-muted" style={{ float: "right", color: CLASSIC.muted, fontWeight: 600 }}>
                    {formatDate(match.kickoff)}
                  </span>
                </th>
                {players.map((player) => (
                  <td
                    key={player.id}
                    style={{
                      border: `1px solid ${CLASSIC.line}`,
                      textAlign: "center",
                      fontSize: 8.2,
                      fontWeight: 900,
                      padding: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {player.predictions[match.id] ?? ""}
                  </td>
                ))}
              </tr>
            ))}

            <tr style={{ height: mmToPx(SPECIAL_ROW_MM), background: CLASSIC.special }}>
              <th
                scope="row"
                className="griglione-dark-cell"
                style={{
                  border: `1px solid ${CLASSIC.strongLine}`,
                  background: CLASSIC.header,
                  color: CLASSIC.paper,
                  textAlign: "left",
                  padding: "2px 5px",
                  fontSize: 8,
                  textTransform: "uppercase",
                }}
              >
                Vincitrice
              </th>
              {players.map((player) => (
                <td
                  key={player.id}
                  style={{
                    border: `1px solid ${CLASSIC.line}`,
                    textAlign: "center",
                    padding: 1,
                    fontSize: 6.8,
                    fontWeight: 800,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pickText(player.winnerPick)}
                </td>
              ))}
            </tr>

            <tr style={{ height: mmToPx(SPECIAL_ROW_MM), background: CLASSIC.special }}>
              <th
                scope="row"
                className="griglione-dark-cell"
                style={{
                  border: `1px solid ${CLASSIC.strongLine}`,
                  background: CLASSIC.header,
                  color: CLASSIC.paper,
                  textAlign: "left",
                  padding: "2px 5px",
                  fontSize: 8,
                  textTransform: "uppercase",
                }}
              >
                Capocannoniere
              </th>
              {players.map((player) => (
                <td
                  key={player.id}
                  style={{
                    border: `1px solid ${CLASSIC.line}`,
                    textAlign: "center",
                    padding: 1,
                    fontSize: 6.5,
                    fontWeight: 700,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pickText(player.topScorerPick)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <footer
          style={{
            marginTop: 7,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 7.5,
            color: CLASSIC.muted,
            fontWeight: 700,
          }}
        >
          <span>schedinone-2026.web.app</span>
          <span>
            {game.name} - generato il {generatedAt}
          </span>
        </footer>
      </div>
    </div>
  );
});

export default GriglionePrintable;
