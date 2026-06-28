import { describe, expect, it } from "vitest";
import { mergeGoldenPlayersWithAccessPayments } from "../goldenPayments";
import type { GoldenAccess, Player } from "../types";

const basePlayer: Player = {
  id: "player-1",
  name: "Giallorossa",
  joinedAt: new Date("2026-06-01T00:00:00Z"),
  predictions: {},
  topScorerPick: "",
  winnerPick: "",
  points: 0,
  paid: false,
  scheduleStatus: "inviata",
};

describe("mergeGoldenPlayersWithAccessPayments", () => {
  it("uses approved Golden access payment status for schedule approval checks", () => {
    const accessItems: GoldenAccess[] = [
      {
        id: "player-1",
        status: "approved",
        type: "classic-player",
        displayName: "Giallorossa",
        paid: true,
      },
    ];

    expect(mergeGoldenPlayersWithAccessPayments([basePlayer], accessItems)[0]).toMatchObject({
      id: "player-1",
      paid: true,
    });
  });

  it("ignores pending or rejected access rows", () => {
    const accessItems: GoldenAccess[] = [
      {
        id: "player-1",
        status: "pending",
        type: "new-request",
        displayName: "Giallorossa",
        paid: true,
      },
    ];

    expect(mergeGoldenPlayersWithAccessPayments([{ ...basePlayer, paid: false }], accessItems)[0].paid).toBe(false);
  });
});
