import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCK_LEAD_HOURS,
  formatLockLead,
  getCloseAt,
  getLockLeadHours,
  isMatchClosedForPredictions,
} from "../scheduleRules";
import type { Game, Match } from "../types";

const game: Game = {
  id: "schedinone-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: [],
  accessCode: "",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

const match: Match = {
  id: "m1",
  phase: "gironi",
  group: "A",
  homeTeam: "Messico",
  awayTeam: "Sudafrica",
  kickoff: new Date("2026-06-11T19:00:00.000Z"),
  result: null,
  score: null,
  locked: false,
};

describe("scheduleRules", () => {
  it("uses a phase-specific lock lead before the global lock lead", () => {
    expect(
      getLockLeadHours(
        {
          ...game,
          lockLeadHours: 24,
          phaseLockLeadHours: { gironi: 0 },
        },
        "gironi"
      )
    ).toBe(0);
  });

  it("falls back to the default lock lead for invalid values", () => {
    expect(getLockLeadHours({ ...game, lockLeadHours: -1 }, "gironi")).toBe(DEFAULT_LOCK_LEAD_HOURS);
  });

  it("closes predictions exactly at kickoff minus the configured lead", () => {
    const closeAt = getCloseAt(game, match);

    expect(closeAt.toISOString()).toBe("2026-06-10T19:00:00.000Z");
    expect(isMatchClosedForPredictions(game, match, new Date("2026-06-10T18:59:59.999Z"))).toBe(false);
    expect(isMatchClosedForPredictions(game, match, closeAt)).toBe(true);
  });

  it("keeps manually locked matches closed regardless of kickoff", () => {
    expect(
      isMatchClosedForPredictions(game, { ...match, locked: true }, new Date("2026-06-01T00:00:00.000Z"))
    ).toBe(true);
  });

  it("keeps Golden Plus predictions open while the emergency override is active", () => {
    const goldenGame: Game = {
      ...game,
      id: "schedinone-golden-plus-2026",
      mode: "golden-plus",
      predictionsOpenUntil: new Date("2026-06-11T22:00:00.000Z"),
    };

    expect(
      isMatchClosedForPredictions(
        goldenGame,
        { ...match, locked: true },
        new Date("2026-06-11T20:00:00.000Z")
      )
    ).toBe(false);
  });

  it("formats the lock lead for committee/user copy", () => {
    expect(formatLockLead(game, "gironi")).toBe("1 giorno prima");
    expect(formatLockLead({ ...game, phaseLockLeadHours: { gironi: 1 } }, "gironi")).toBe("1 ora prima");
  });
});
