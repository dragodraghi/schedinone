import { describe, expect, it } from "vitest";
import { getTopPlayers, rankPlayersForLeaderboard, sortPlayersForLeaderboard } from "../playerOrdering";
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

describe("sortPlayersForLeaderboard", () => {
  it("sorts by points, then join date, then name, then id", () => {
    const players = [
      player({ id: "z", name: "Zulu", points: 8, joinedAt: new Date("2026-01-03T00:00:00Z") }),
      player({ id: "b", name: "Bravo", points: 10, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "a", name: "Alpha", points: 10, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "old", name: "Older", points: 10, joinedAt: new Date("2026-01-01T00:00:00Z") }),
      player({ id: "aa", name: "Alpha", points: 10, joinedAt: new Date("2026-01-02T00:00:00Z") }),
    ];

    expect(sortPlayersForLeaderboard(players).map((p) => p.id)).toEqual(["old", "a", "aa", "b", "z"]);
  });

  it("does not mutate the original list", () => {
    const players = [
      player({ id: "late", points: 1, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "early", points: 1, joinedAt: new Date("2026-01-01T00:00:00Z") }),
    ];

    expect(sortPlayersForLeaderboard(players).map((p) => p.id)).toEqual(["early", "late"]);
    expect(players.map((p) => p.id)).toEqual(["late", "early"]);
  });
});

describe("rankPlayersForLeaderboard", () => {
  it("keeps tied players on the same rank", () => {
    const players = [
      player({ id: "third-a", name: "Third A", points: 8, joinedAt: new Date("2026-01-01T00:00:00Z") }),
      player({ id: "first-b", name: "First B", points: 10, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "first-a", name: "First A", points: 10, joinedAt: new Date("2026-01-01T00:00:00Z") }),
      player({ id: "third-b", name: "Third B", points: 8, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "fifth", name: "Fifth", points: 1, joinedAt: new Date("2026-01-01T00:00:00Z") }),
    ];

    expect(rankPlayersForLeaderboard(players).map(({ player: p, rank }) => `${p.id}:${rank}`)).toEqual([
      "first-a:1",
      "first-b:1",
      "third-a:3",
      "third-b:3",
      "fifth:5",
    ]);
  });
});

describe("getTopPlayers", () => {
  it("returns every player tied for first place", () => {
    const players = [
      player({ id: "one", points: 7, joinedAt: new Date("2026-01-01T00:00:00Z") }),
      player({ id: "two", points: 7, joinedAt: new Date("2026-01-02T00:00:00Z") }),
      player({ id: "three", points: 5, joinedAt: new Date("2026-01-01T00:00:00Z") }),
    ];

    expect(getTopPlayers(players).map((p) => p.id)).toEqual(["one", "two"]);
  });
});
