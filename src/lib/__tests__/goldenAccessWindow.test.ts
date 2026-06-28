import { describe, expect, it } from "vitest";
import {
  formatGoldenAccessClosesAt,
  getGoldenAccessClosesAt,
  isGoldenAccessOpen,
} from "../goldenAccessWindow";
import type { Game, Match } from "../types";

const game: Game = {
  id: "schedinone-golden-plus-2026",
  name: "Golden",
  entryFee: 0,
  admins: [],
  accessCode: "",
  phases: ["sedicesimi"],
  currentPhase: "sedicesimi",
  topScorer: null,
  winner: null,
  lockLeadHours: 1,
};

const matches: Match[] = [
  {
    id: "r32-02",
    phase: "sedicesimi",
    group: null,
    homeTeam: "Brasile",
    awayTeam: "Giappone",
    kickoff: new Date("2026-06-29T17:00:00Z"),
    result: null,
    score: null,
    locked: false,
  },
  {
    id: "r32-01",
    phase: "sedicesimi",
    group: null,
    homeTeam: "Sudafrica",
    awayTeam: "Canada",
    kickoff: new Date("2026-06-28T19:00:00Z"),
    result: null,
    score: null,
    locked: false,
  },
];

describe("golden access window", () => {
  it("closes one hour before the first Golden match by default", () => {
    expect(getGoldenAccessClosesAt(game, matches)?.toISOString()).toBe("2026-06-28T18:00:00.000Z");
  });

  it("uses an explicit accessClosesAt when configured on the game", () => {
    expect(
      getGoldenAccessClosesAt(
        { ...game, accessClosesAt: new Date("2026-06-28T17:30:00Z") },
        matches
      )?.toISOString()
    ).toBe("2026-06-28T17:30:00.000Z");
  });

  it("treats the exact deadline as closed", () => {
    const deadline = new Date("2026-06-28T18:00:00Z");

    expect(isGoldenAccessOpen(deadline, new Date("2026-06-28T17:59:59Z"))).toBe(true);
    expect(isGoldenAccessOpen(deadline, new Date("2026-06-28T18:00:00Z"))).toBe(false);
  });

  it("formats the Italian operational deadline", () => {
    expect(formatGoldenAccessClosesAt(new Date("2026-06-28T18:00:00Z"))).toContain("28 giu");
    expect(formatGoldenAccessClosesAt(null)).toBe("Da definire");
  });
});
