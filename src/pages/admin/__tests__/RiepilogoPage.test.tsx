import { MemoryRouter } from "react-router-dom";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function makePlayer(
  id: string,
  name: string,
  prediction: "1" | "X" | "2",
  scheduleStatus: Player["scheduleStatus"] = "bozza"
): Player {
  return {
    id,
    name,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: { m1: prediction },
    topScorerPick: `${name} Bomber`,
    winnerPick: "Italia",
    points: 0,
    paid: true,
    scheduleStatus,
  };
}

function renderRiepilogo(players: Player[], currentPlayer?: Player) {
  render(
    <MemoryRouter>
      <RiepilogoPage
        game={game}
        matches={[match]}
        players={players}
        currentPlayer={currentPlayer}
      />
    </MemoryRouter>
  );
}

describe("RiepilogoPage player visibility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra al giocatore solo la propria schedina nel griglione", () => {
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2");

    renderRiepilogo([currentPlayer, otherPlayer], currentPlayer);

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.queryByTitle("Luigi Verdi")).not.toBeInTheDocument();
    expect(screen.getByText(/1 giocatori/)).toBeInTheDocument();
  });

  it("lascia al Comitato la vista completa di tutte le schedine", () => {
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2");

    renderRiepilogo([currentPlayer, otherPlayer]);

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByTitle("Luigi Verdi")).toBeInTheDocument();
    expect(screen.getByText(/2 giocatori/)).toBeInTheDocument();
  });

  it("non apre il griglione completo prima della chiusura anche se tutte le schedine sono accettate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T17:59:00Z"));
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1", "accettata");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2", "accettata");

    renderRiepilogo([currentPlayer, otherPlayer], currentPlayer);

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.queryByTitle("Luigi Verdi")).not.toBeInTheDocument();
  });

  it("non apre il griglione completo dopo la chiusura se manca una schedina", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T18:01:00Z"));
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1", "accettata");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2", "bozza");

    renderRiepilogo([currentPlayer, otherPlayer], currentPlayer);

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.queryByTitle("Luigi Verdi")).not.toBeInTheDocument();
  });

  it("apre il griglione completo ai giocatori dopo la chiusura quando tutte le schedine sono accettate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T18:01:00Z"));
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1", "accettata");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2", "accettata");

    renderRiepilogo([currentPlayer, otherPlayer], currentPlayer);

    expect(screen.getByTitle("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByTitle("Luigi Verdi")).toBeInTheDocument();
    expect(screen.getByText(/2 giocatori/)).toBeInTheDocument();
  });

  it("apre automaticamente il griglione completo quando passa l'orario di chiusura", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T17:59:00Z"));
    const currentPlayer = makePlayer("player-1", "Mario Rossi", "1", "accettata");
    const otherPlayer = makePlayer("player-2", "Luigi Verdi", "2", "accettata");

    renderRiepilogo([currentPlayer, otherPlayer], currentPlayer);

    expect(screen.queryByTitle("Luigi Verdi")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(screen.getByTitle("Luigi Verdi")).toBeInTheDocument();
    expect(screen.getByText(/2 giocatori/)).toBeInTheDocument();
  });
});
