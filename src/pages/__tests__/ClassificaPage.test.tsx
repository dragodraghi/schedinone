import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClassificaPage from "../ClassificaPage";
import type { Game, Player } from "../../lib/types";

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

function player(overrides: Partial<Player>): Player {
  return {
    id: "p1",
    name: "Team",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: true,
    scheduleStatus: "accettata",
    ...overrides,
  };
}

describe("ClassificaPage", () => {
  it("shows tied leaders as pari merito", () => {
    const first = player({ id: "first", name: "Prima Squadra", points: 10 });
    const tied = player({ id: "tied", name: "Seconda Squadra", points: 10 });
    const third = player({ id: "third", name: "Terza Squadra", points: 8 });

    render(<ClassificaPage game={game} player={first} players={[first, tied, third]} />);

    expect(screen.getByText("2 pari merito")).toBeInTheDocument();
    expect(screen.getByText("10 punti ciascuno")).toBeInTheDocument();
    expect(screen.queryByText("Prima Squadra")).toBeInTheDocument();
    expect(screen.queryByText("Seconda Squadra")).toBeInTheDocument();
  });
});
