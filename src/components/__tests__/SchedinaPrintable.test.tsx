import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SchedinaPrintable from "../SchedinaPrintable";
import type { Game, Match, Player } from "../../lib/types";

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

const player: Player = {
  id: "player-1",
  name: "Squadra Test",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: {},
  topScorerPick: "",
  winnerPick: "",
  points: 0,
  paid: true,
  scheduleStatus: "bozza",
};

function makeMatch(id: string, group: string, kickoff: string): Match {
  return {
    id,
    phase: "gironi",
    group,
    homeTeam: `Casa ${group}`,
    awayTeam: `Trasferta ${group}`,
    kickoff: new Date(kickoff),
    result: null,
    score: null,
    locked: false,
  };
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe("SchedinaPrintable", () => {
  it("renders the personal PDF schedule chronologically across groups", () => {
    render(
      <SchedinaPrintable
        game={game}
        player={player}
        matches={[
          makeMatch("c1", "C", "2026-06-13T22:00:00Z"),
          makeMatch("a1", "A", "2026-06-12T11:00:00Z"),
          makeMatch("b1", "B", "2026-06-12T10:00:00Z"),
        ]}
        predictions={{}}
        topScorerPick=""
        winnerPick=""
      />
    );

    expect(screen.getAllByText(/12 giugno/i).length).toBeGreaterThan(0);
    expectBefore(screen.getByText("Casa B"), screen.getByText("Casa A"));
    expectBefore(screen.getByText("Casa A"), screen.getByText("Casa C"));
  });
});
