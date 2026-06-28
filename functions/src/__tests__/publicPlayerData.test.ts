import { describe, expect, it } from "vitest";
import { buildPublicPlayerData } from "../publicPlayerData";

describe("buildPublicPlayerData", () => {
  it("publishes predictions only after a schedule is accepted", () => {
    const playerData = {
      name: "Italia",
      joinedAt: "joined-at",
      points: 7,
      previousRank: 2,
      paid: true,
      scheduleStatus: "inviata",
      predictions: { m1: "1" },
      topScorerPick: "Messi",
      winnerPick: "Italia",
    };

    expect(buildPublicPlayerData(playerData)).toMatchObject({
      scheduleStatus: "inviata",
      predictions: {},
      topScorerPick: "",
      winnerPick: "",
    });

    expect(
      buildPublicPlayerData({
        ...playerData,
        scheduleStatus: "accettata",
      })
    ).toMatchObject({
      name: "Italia",
      points: 7,
      previousRank: 2,
      paid: true,
      scheduleStatus: "accettata",
      predictions: { m1: "1" },
      topScorerPick: "Messi",
      winnerPick: "Italia",
    });
  });
});
