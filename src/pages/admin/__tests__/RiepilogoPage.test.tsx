import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RiepilogoPage from "../RiepilogoPage";
import type { Game, Match, Player } from "../../../lib/types";

vi.mock("../../../lib/pdfExport", () => ({
  exportElementAsPdf: vi.fn(),
  timestampSlug: vi.fn(() => "test"),
}));

vi.mock("../../../lib/haptic", () => ({
  vibrate: vi.fn(),
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

function makePlayer(id: string, name: string, prediction: "1" | "X" | "2"): Player {
  return {
    id,
    name,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { m1: prediction },
    topScorerPick: `${name} Bomber`,
    winnerPick: "Italia",
    points: 0,
    paid: true,
    scheduleStatus: "bozza",
  };
}

describe("RiepilogoPage player visibility", () => {
  it("mostra al giocatore solo la propria schedina nel griglione", () => {
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2");

    render(
      <MemoryRouter>
        <RiepilogoPage
          game={game}
          matches={[match]}
          players={[currentPlayer, otherPlayer]}
          currentPlayer={currentPlayer}
        />
      </MemoryRouter>
    );

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.queryByTitle("Luigi Verdi")).not.toBeInTheDocument();
    expect(screen.getByText("1 giocatori · 1 partite")).toBeInTheDocument();
  });

  it("lascia al Comitato la vista completa di tutte le schedine", () => {
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2");

    render(
      <MemoryRouter>
        <RiepilogoPage
          game={game}
          matches={[match]}
          players={[currentPlayer, otherPlayer]}
        />
      </MemoryRouter>
    );

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByTitle("Luigi Verdi")).toBeInTheDocument();
    expect(screen.getByText("2 giocatori · 1 partite")).toBeInTheDocument();
  });
});
