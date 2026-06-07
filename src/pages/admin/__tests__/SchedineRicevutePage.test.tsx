import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchedineRicevutePage from "../SchedineRicevutePage";
import type { Game, Player } from "../../../lib/types";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn(),
  })),
}));

vi.mock("../../../lib/firebase", () => ({
  db: {},
}));

const game: Game = {
  id: "world-cup-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: [],
  accessCode: "test",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

const basePlayer: Player = {
  id: "player-1",
  name: "Aureliano Buendia",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: { m1: "1" },
  topScorerPick: "Messi",
  winnerPick: "Italia",
  points: 0,
  paid: false,
  scheduleStatus: "inviata",
};

function renderPage(players: Player[]) {
  return render(
    <MemoryRouter>
      <SchedineRicevutePage
        players={players}
        matches={[
          {
            id: "m1",
            phase: "gironi",
            group: "A",
            homeTeam: "Messico",
            awayTeam: "Sudafrica",
            kickoff: new Date("2026-06-11T19:00:00Z"),
            result: null,
            score: null,
            locked: false,
          },
        ]}
        gameId="world-cup-2026"
        game={game}
      />
    </MemoryRouter>
  );
}

describe("SchedineRicevutePage payment guard", () => {
  it("does not allow accepting an unpaid submitted schedule", () => {
    renderPage([basePlayer]);

    expect(screen.getByText("Non pagato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagamento mancante/i })).toBeDisabled();
  });

  it("allows accepting a paid submitted schedule", () => {
    renderPage([{ ...basePlayer, paid: true }]);

    expect(screen.getByText("Pagato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accetta schedina/i })).not.toBeDisabled();
  });
});
