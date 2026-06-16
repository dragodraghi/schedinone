import { describe, expect, it } from "vitest";
import { isScheduleCommitted, maskComparisonPlayers } from "../comparisonVisibility";
import type { Game, Match, Player } from "../types";

const game: Game = {
  id: "schedinone-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: [],
  accessCode: "test",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

const matches: Match[] = [
  // Already locked -> closed for predictions regardless of "now".
  {
    id: "locked",
    phase: "gironi",
    group: "A",
    homeTeam: "Italia",
    awayTeam: "Brasile",
    kickoff: new Date("2026-06-11T18:00:00Z"),
    result: "1",
    score: "2-1",
    locked: true,
  },
  // Not locked, kickoff far in the future -> open for predictions.
  {
    id: "future",
    phase: "gironi",
    group: "A",
    homeTeam: "Canada",
    awayTeam: "Messico",
    kickoff: new Date("2026-06-20T18:00:00Z"),
    result: null,
    score: null,
    locked: false,
  },
];

// A moment before "future" closes (its close = kickoff - 24h = 2026-06-19T18:00Z).
const NOW = new Date("2026-06-10T12:00:00Z");

function makePlayer(id: string, status: Player["scheduleStatus"]): Player {
  return {
    id,
    name: id,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { locked: "1", future: "X" },
    topScorerPick: "Pippo",
    winnerPick: "Italia",
    points: 1,
    paid: true,
    scheduleStatus: status,
  };
}

describe("isScheduleCommitted", () => {
  it("treats inviata/accettata as committed and bozza/rifiutata as not", () => {
    expect(isScheduleCommitted("inviata")).toBe(true);
    expect(isScheduleCommitted("accettata")).toBe(true);
    expect(isScheduleCommitted("bozza")).toBe(false);
    expect(isScheduleCommitted("rifiutata")).toBe(false);
  });
});

describe("maskComparisonPlayers", () => {
  const viewer = makePlayer("me", "bozza");
  const other = makePlayer("rival", "accettata");

  it("returns players untouched when the viewer is committed", () => {
    const result = maskComparisonPlayers([viewer, other], matches, game, "me", true, NOW);
    expect(result).toEqual([viewer, other]);
  });

  it("hides other players' future picks and special picks when viewer is not committed", () => {
    const result = maskComparisonPlayers([viewer, other], matches, game, "me", false, NOW);
    const maskedOther = result.find((p) => p.id === "rival")!;

    // Locked match prediction stays, future one is hidden.
    expect(maskedOther.predictions).toEqual({ locked: "1" });
    expect(maskedOther.predictions.future).toBeUndefined();
    // Special picks hidden.
    expect(maskedOther.topScorerPick).toBe("");
    expect(maskedOther.winnerPick).toBe("");
  });

  it("never masks the viewer's own row", () => {
    const result = maskComparisonPlayers([viewer, other], matches, game, "me", false, NOW);
    const me = result.find((p) => p.id === "me")!;

    expect(me.predictions).toEqual({ locked: "1", future: "X" });
    expect(me.topScorerPick).toBe("Pippo");
    expect(me.winnerPick).toBe("Italia");
  });
});
