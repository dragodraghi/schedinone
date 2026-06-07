import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfiloPage from "../ProfiloPage";
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
  name: "Italia",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: {},
  topScorerPick: "",
  winnerPick: "",
  points: 0,
  paid: false,
  scheduleStatus: "bozza",
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

describe("ProfiloPage player access", () => {
  it("allows a player session to leave and switch to committee login", () => {
    const onLogout = vi.fn();

    render(
      <MemoryRouter>
        <ProfiloPage
          game={game}
          player={player}
          players={[player]}
          matches={[match]}
          isAdmin={false}
          onLogout={onLogout}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /entra come comitato/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("shows player announcement access for an admin linked to a player profile", () => {
    render(
      <MemoryRouter>
        <ProfiloPage
          game={game}
          player={player}
          players={[player]}
          matches={[match]}
          isAdmin
          hasPlayerProfile
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Italia" })).toBeInTheDocument();
    expect(screen.getByText(/Avvisi Comitato/)).toBeInTheDocument();
  });

  it("warns the player when service communications must be read", () => {
    render(
      <MemoryRouter>
        <ProfiloPage
          game={game}
          player={player}
          players={[player]}
          matches={[match]}
          isAdmin={false}
          unreadAnnouncementCount={2}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/2 da leggere/i)).toBeInTheDocument();
  });

  it("warns the player when the committee replied privately", () => {
    render(
      <MemoryRouter>
        <ProfiloPage
          game={game}
          player={player}
          players={[player]}
          matches={[match]}
          isAdmin={false}
          unreadPrivateMessageCount={1}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/1 risposta/i)).toBeInTheDocument();
    expect(screen.getByText(/Risposta personale del Comitato da leggere/i)).toBeInTheDocument();
  });
});
