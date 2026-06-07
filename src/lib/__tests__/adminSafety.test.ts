import { describe, expect, it } from "vitest";
import { getWorldCupSeedSafety } from "../adminSafety";
import type { Player } from "../types";

function player(overrides: Partial<Player>): Player {
  return {
    id: "p1",
    name: "Team",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: false,
    scheduleStatus: "bozza",
    ...overrides,
  };
}

describe("getWorldCupSeedSafety", () => {
  it("allows seeding when no player has saved or submitted predictions", () => {
    expect(getWorldCupSeedSafety([
      player({ id: "p1" }),
      player({ id: "p2", scheduleStatus: "rifiutata" }),
    ])).toEqual({ atRiskPlayers: 0, blocked: false });
  });

  it("blocks seeding when players have draft predictions", () => {
    expect(getWorldCupSeedSafety([
      player({ id: "p1", predictions: { m1: "1" } }),
      player({ id: "p2" }),
    ])).toEqual({ atRiskPlayers: 1, blocked: true });
  });

  it("blocks seeding when players already submitted or were accepted", () => {
    expect(getWorldCupSeedSafety([
      player({ id: "p1", scheduleStatus: "inviata" }),
      player({ id: "p2", scheduleStatus: "accettata" }),
      player({ id: "p3", scheduleStatus: "rifiutata", predictions: { m2: "X" } }),
    ])).toEqual({ atRiskPlayers: 3, blocked: true });
  });
});
