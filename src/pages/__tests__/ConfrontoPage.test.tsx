import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ConfrontoPage from "../ConfrontoPage";
import type { Game, Match, Player, ScheduleStatus } from "../../lib/types";

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

function makePlayer(id: string, name: string, status: ScheduleStatus, points: number): Player {
  return {
    id,
    name,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { m1: "1" },
    topScorerPick: "",
    winnerPick: "",
    points,
    paid: true,
    scheduleStatus: status,
  };
}

function renderPage(player: Player, players: Player[]) {
  render(
    <MemoryRouter>
      <ConfrontoPage game={game} player={player} players={players} matches={matches} />
    </MemoryRouter>
  );
}

describe("ConfrontoPage (giocatore)", () => {
  it("lists only accepted schedine plus the viewer, and selects the viewer by default", () => {
    const me = makePlayer("me", "Io", "accettata", 8);
    renderPage(me, [
      me,
      makePlayer("a", "Squadra A", "accettata", 7),
      makePlayer("b", "Squadra B", "inviata", 6),
      makePlayer("c", "Squadra C", "bozza", 5),
    ]);

    expect(screen.getByRole("button", { name: /Io/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Squadra A/i })).toBeInTheDocument();
    // Not-accepted others are excluded from the picker.
    expect(screen.queryByRole("button", { name: /Squadra B/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Squadra C/i })).toBeNull();
    // Viewer is preselected.
    expect(screen.getByText(/1 selezionata di 2/i)).toBeInTheDocument();
  });

  it("limits the selection to four squadre", () => {
    const me = makePlayer("me", "Io", "accettata", 100);
    renderPage(me, [
      me,
      makePlayer("a", "Squadra A", "accettata", 9),
      makePlayer("b", "Squadra B", "accettata", 8),
      makePlayer("c", "Squadra C", "accettata", 7),
      makePlayer("d", "Squadra D", "accettata", 6),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Squadra A/i }));
    fireEvent.click(screen.getByRole("button", { name: /Squadra B/i }));
    fireEvent.click(screen.getByRole("button", { name: /Squadra C/i }));

    expect(screen.getByText(/4 selezionate di 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Squadra D/i })).toBeDisabled();
  });

  it("warns about anti-copy masking when the viewer's schedule is still editable", () => {
    const me = makePlayer("me", "Io", "bozza", 0);
    renderPage(me, [me, makePlayer("a", "Squadra A", "accettata", 7)]);

    expect(screen.getByText(/Finché non invii la tua schedina/i)).toBeInTheDocument();
  });

  it("does not show the masking warning when the viewer has submitted", () => {
    const me = makePlayer("me", "Io", "accettata", 7);
    renderPage(me, [me, makePlayer("a", "Squadra A", "accettata", 7)]);

    expect(screen.queryByText(/Finché non invii la tua schedina/i)).toBeNull();
  });
});
