import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComparisonTable from "../ComparisonTable";
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

const matches: Match[] = [
  {
    id: "m1",
    phase: "gironi",
    group: "A",
    homeTeam: "Italia",
    awayTeam: "Brasile",
    kickoff: new Date("2026-06-11T18:00:00Z"),
    result: "1",
    score: "2-1",
    locked: true,
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

function makePlayer(id: string, name: string, predictions: Player["predictions"], points: number): Player {
  return {
    id,
    name,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions,
    topScorerPick: "",
    winnerPick: "",
    points,
    paid: true,
    scheduleStatus: "accettata",
  };
}

describe("ComparisonTable", () => {
  it("includes the selected players' match predictions in the comparison", () => {
    render(
      <ComparisonTable
        game={game}
        matches={matches}
        players={[
          makePlayer("p1", "Squadra A", { m1: "1", m2: "X" }, 1),
          makePlayer("p2", "Squadra B", { m1: "2", m2: "1" }, 0),
        ]}
      />
    );

    const schedule = screen.getByRole("region", { name: /schedina partita per partita/i });
    expect(within(schedule).getByText("Italia - Brasile")).toBeInTheDocument();
    expect(within(schedule).getByText("Canada - Messico")).toBeInTheDocument();
    expect(within(schedule).getByLabelText("Pronostico Squadra A per Italia - Brasile")).toHaveTextContent("1");
    expect(within(schedule).getByLabelText("Pronostico Squadra B per Italia - Brasile")).toHaveTextContent("2");
    expect(within(schedule).getByLabelText("Pronostico Squadra A per Canada - Messico")).toHaveTextContent("X");
    expect(within(schedule).getByLabelText("Pronostico Squadra B per Canada - Messico")).toHaveTextContent("1");
  });

  it("uses one compact player header instead of repeating names for every match", () => {
    render(
      <ComparisonTable
        game={game}
        matches={matches}
        players={[
          makePlayer("p1", "Squadra A", { m1: "1", m2: "X" }, 1),
          makePlayer("p2", "Squadra B", { m1: "2", m2: "1" }, 0),
        ]}
      />
    );

    const schedule = screen.getByRole("region", { name: /schedina partita per partita/i });
    expect(within(schedule).getAllByText("Squadra A")).toHaveLength(1);
    expect(within(schedule).getAllByText("Squadra B")).toHaveLength(1);
  });
});
