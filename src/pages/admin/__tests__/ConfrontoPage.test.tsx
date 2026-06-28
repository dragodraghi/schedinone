import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ConfrontoPage from "../ConfrontoPage";
import type { Game, Match, Player } from "../../../lib/types";

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
  {
    id: "m1",
    phase: "gironi",
    group: "A",
    homeTeam: "Italia",
    awayTeam: "Brasile",
    kickoff: new Date("2026-06-11T18:00:00Z"),
    result: null,
    score: null,
    locked: false,
  },
];

function makePlayer(index: number): Player {
  return {
    id: `p${index}`,
    name: `Squadra ${index}`,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { m1: index % 2 === 0 ? "1" : "X" },
    topScorerPick: "",
    winnerPick: "",
    points: 10 - index,
    paid: true,
    scheduleStatus: "accettata",
  };
}

function renderPage(players: Player[]) {
  render(
    <MemoryRouter>
      <ConfrontoPage game={game} players={players} matches={matches} />
    </MemoryRouter>
  );
}

describe("ConfrontoPage", () => {
  it("shows the maximum comparison size at the top", () => {
    renderPage([1, 2, 3, 4, 5].map(makePlayer));

    expect(screen.getByText(/massimo 4 squadre contemporaneamente/i)).toBeInTheDocument();
  });

  it("limits the selected comparison players to four", () => {
    renderPage([1, 2, 3, 4, 5].map(makePlayer));

    fireEvent.click(screen.getByRole("button", { name: /top 4/i }));
    expect(screen.getByText(/4 selezionati di 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Squadra 5/i })).toBeDisabled();
  });
});
