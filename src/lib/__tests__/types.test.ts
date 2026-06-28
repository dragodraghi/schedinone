import { describe, it, expect } from "vitest";
import { GOLDEN_GAME_ID, isGoldenGameId } from "../games";
import type { Game, GoldenAccess, Match, Player } from "../types";

describe("types", () => {
  it("Game type has required fields", () => {
    const game: Game = {
      id: "game1",
      name: "SCHEDINONE Mondiali 2026",
      entryFee: 10,
      admins: ["uid1"],
      adminCode: "ADMIN123",
      accessCode: "PLAY456",
      phases: ["gironi", "ottavi", "quarti", "semifinali", "finale"],
      currentPhase: "gironi",
      topScorer: null,
      winner: null,
    };
    expect(game.name).toBe("SCHEDINONE Mondiali 2026");
    expect(game.phases).toHaveLength(5);
  });

  it("Match type has required fields", () => {
    const match: Match = {
      id: "m1",
      phase: "gironi",
      group: "A",
      homeTeam: "Italia",
      awayTeam: "Brasile",
      kickoff: new Date("2026-06-11T18:00:00Z"),
      result: null,
      score: null,
      locked: false,
    };
    expect(match.locked).toBe(false);
    expect(match.result).toBeNull();
  });

  it("Golden Plus type fields model a separate qualifier game", () => {
    const game: Game = {
      id: GOLDEN_GAME_ID,
      name: "Schedinone Golden Plus 2026",
      entryFee: 0,
      admins: ["admin-1"],
      accessCode: "",
      phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
      currentPhase: "sedicesimi",
      topScorer: null,
      winner: null,
      mode: "golden-plus",
      predictionMode: "qualifier",
      specialPicksEnabled: false,
      sourceGameId: "schedinone-2026",
    };
    const access: GoldenAccess = {
      id: "player-1",
      status: "approved",
      type: "classic-player",
      displayName: "Italia",
      classicPlayerUid: "player-1",
    };

    expect(isGoldenGameId(game.id)).toBe(true);
    expect(game.phases[0]).toBe("sedicesimi");
    expect(access.status).toBe("approved");
  });

  it("Player type has required fields", () => {
    const player: Player = {
      id: "p1",
      name: "Marco",
      joinedAt: new Date(),
      predictions: { m1: "1", m2: "X" },
      topScorerPick: "Mbappé",
      winnerPick: "Francia",
      points: 0,
      paid: false,
      scheduleStatus: "bozza",
    };
    expect(player.predictions.m1).toBe("1");
  });
});
