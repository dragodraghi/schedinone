import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GriglionePrintable, { calculateGriglionePdfLayout } from "../GriglionePrintable";
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

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { m1: "1", m2: "X" },
    topScorerPick: `${name} Bomber`,
    winnerPick: "Italia",
    points: 0,
    paid: true,
    scheduleStatus: "accettata",
  };
}

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
  {
    id: "m2",
    phase: "gironi",
    group: "A",
    homeTeam: "Canada",
    awayTeam: "Messico",
    kickoff: new Date("2026-06-12T18:00:00Z"),
    result: null,
    score: null,
    locked: false,
  },
];

describe("GriglionePrintable", () => {
  it("renders every received player and the special prediction rows", () => {
    const players = [makePlayer("p1", "Ac picchia 2026"), makePlayer("p2", "Oreste Pieroni F.C.")];

    render(<GriglionePrintable game={game} players={players} matches={matches} />);

    expect(screen.getByText("The Big Pool - La Gran Quiniela - Le Grand Pool 2026")).toBeInTheDocument();
    expect(screen.getByText("Ac picchia 2026")).toBeInTheDocument();
    expect(screen.getByText("Oreste Pieroni F.C.")).toBeInTheDocument();
    expect(screen.getByText("Italia - Brasile")).toBeInTheDocument();
    expect(screen.getByText("Canada - Messico")).toBeInTheDocument();
    expect(screen.getByText("Vincitrice")).toBeInTheDocument();
    expect(screen.getByText("Capocannoniere")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: /griglione/i });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
  });

  it("uses the clean classic palette without host-flag color blocks", () => {
    const players = [makePlayer("p1", "Ac picchia 2026")];

    const { container } = render(<GriglionePrintable game={game} players={players} matches={matches} />);

    expect(container.querySelector('[data-palette="classic-clean"]')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("rgb(0, 40, 104)");
    expect(container.innerHTML).not.toContain("rgb(0, 104, 71)");
    expect(container.innerHTML).not.toContain("rgb(213, 43, 30)");
  });

  it("marks dark cells so player names stay readable in the PDF export", () => {
    const players = [makePlayer("p1", "Ac picchia 2026")];

    render(<GriglionePrintable game={game} players={players} matches={matches} />);

    expect(screen.getByRole("columnheader", { name: "Partite" })).toHaveClass("griglione-dark-cell");
    expect(screen.getByText("Ac picchia 2026").closest("th")).toHaveClass("griglione-dark-cell");
    expect(screen.getByText("Vincitrice").closest("th")).toHaveClass("griglione-dark-cell");
    expect(screen.getByText("Capocannoniere").closest("th")).toHaveClass("griglione-dark-cell");
  });

  it("calculates a landscape custom page for many teams", () => {
    const layout = calculateGriglionePdfLayout(31, 72);

    expect(layout.orientation).toBe("landscape");
    expect(layout.format[0]).toBeGreaterThan(layout.format[1]);
    expect(layout.widthPx).toBeGreaterThan(1400);
    expect(layout.heightMm).toBeGreaterThan(370);
  });
});
