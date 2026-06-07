import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SchedinaPage from "../SchedinaPage";
import type { Game, Match, Player } from "../../lib/types";

vi.mock("../../lib/schedule", () => ({
  saveSchedule: vi.fn(),
}));

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

const player: Player = {
  id: "player-1",
  name: "Alberto Pileri",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: { m1: "1" },
  topScorerPick: "Messi",
  winnerPick: "Italia",
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

function groupHeading(name: string): HTMLElement {
  const heading = screen.getAllByText(`Gruppo ${name}`).find((el) => el.tagName.toLowerCase() === "h2");
  if (!heading) throw new Error(`Missing group heading ${name}`);
  return heading;
}

describe("SchedinaPage prediction editing", () => {
  it("removes an already selected prediction when the same sign is clicked again", () => {
    render(<SchedinaPage game={game} player={player} matches={[match]} gameId="schedinone-2026" />);

    expect(screen.getByText("1/1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancella pronostico/i }));

    expect(screen.getByText("0/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mancano 1 pronostico/i })).toBeDisabled();
  });

  it("mostra i gironi in ordine alfabetico anche se le partite arrivano ordinate per orario", () => {
    render(
      <SchedinaPage
        game={game}
        player={{ ...player, predictions: {}, topScorerPick: "", winnerPick: "" }}
        matches={[
          makeMatch("a1", "A", "2026-06-11T19:00:00Z"),
          makeMatch("b1", "B", "2026-06-12T19:00:00Z"),
          makeMatch("d1", "D", "2026-06-13T01:00:00Z"),
          makeMatch("c1", "C", "2026-06-13T22:00:00Z"),
        ]}
        gameId="schedinone-2026"
      />
    );

    const groupA = groupHeading("A");
    const groupB = groupHeading("B");
    const groupC = groupHeading("C");
    const groupD = groupHeading("D");

    expectBefore(groupA, groupB);
    expectBefore(groupB, groupC);
    expectBefore(groupC, groupD);
  });
});
