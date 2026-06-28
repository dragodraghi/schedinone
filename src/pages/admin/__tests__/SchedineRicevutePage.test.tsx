import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchedineRicevutePage from "../SchedineRicevutePage";
import type { Game, Match, Player } from "../../../lib/types";

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

function renderPage(players: Player[], overrides?: { game?: Game; matches?: Match[] }) {
  return render(
    <MemoryRouter>
      <SchedineRicevutePage
        players={players}
        matches={overrides?.matches ?? [
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
        gameId={overrides?.game?.id ?? "world-cup-2026"}
        game={overrides?.game ?? game}
      />
    </MemoryRouter>
  );
}

describe("SchedineRicevutePage payment guard", () => {
  it("allows accepting an unpaid submitted schedule and keeps it marked as unpaid", () => {
    renderPage([basePlayer]);

    expect(screen.getByText("Non pagato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accetta schedina/i })).not.toBeDisabled();
  });

  it("allows accepting a paid submitted schedule", () => {
    renderPage([{ ...basePlayer, paid: true }]);

    expect(screen.getByText("Pagato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accetta schedina/i })).not.toBeDisabled();
  });

  it("counts every Golden Plus bracket pick instead of only the current phase", () => {
    const goldenGame: Game = {
      ...game,
      id: "schedinone-golden-plus-2026",
      name: "Schedinone Golden Plus 2026",
      phases: ["sedicesimi", "ottavi"],
      currentPhase: "sedicesimi",
      mode: "golden-plus",
      predictionMode: "qualifier",
      specialPicksEnabled: false,
    };
    const goldenMatches: Match[] = [
      {
        id: "r32-01",
        phase: "sedicesimi",
        group: null,
        homeTeam: "Italia",
        awayTeam: "Brasile",
        kickoff: new Date("2026-06-28T19:00:00Z"),
        result: null,
        score: null,
        locked: false,
      },
      {
        id: "r16-01",
        phase: "ottavi",
        group: null,
        homeTeam: "Vincente r32-01",
        awayTeam: "Vincente r32-02",
        kickoff: new Date("2026-07-04T19:00:00Z"),
        result: null,
        score: null,
        locked: false,
      },
    ];

    renderPage(
      [
        {
          ...basePlayer,
          name: "Giallorossa",
          predictions: { "r32-01": "1", "r16-01": "2" },
          topScorerPick: "",
          winnerPick: "",
          paid: true,
        },
      ],
      { game: goldenGame, matches: goldenMatches }
    );

    expect(screen.getByRole("heading", { name: /schedine golden/i })).toBeInTheDocument();
    expect(screen.getAllByText("2/2").length).toBeGreaterThan(0);
    expect(screen.getByText("Schedina compilata")).toBeInTheDocument();
    expect(screen.getByTestId("golden-picks-compact-player-1")).toHaveClass("grid");
    expect(screen.getAllByText(/r32-01/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Italia").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/r16-01/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vincente r32-02").length).toBeGreaterThan(0);
    expect(screen.queryByText(/capocannoniere/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vincitrice/i)).not.toBeInTheDocument();
  });
});
