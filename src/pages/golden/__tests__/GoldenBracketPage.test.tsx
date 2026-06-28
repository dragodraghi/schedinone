import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoldenBracketPage from "../GoldenBracketPage";
import type { Game, Match, Phase, Player } from "../../../lib/types";

const scheduleMocks = vi.hoisted(() => ({
  saveSchedule: vi.fn(() => Promise.resolve({ ok: true, scheduleStatus: "bozza" })),
}));

vi.mock("../../../lib/schedule", () => scheduleMocks);

vi.mock("../../../lib/haptic", () => ({
  vibrate: vi.fn(),
}));

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

function bracketMatch(
  id: string,
  phase: Phase,
  homeTeam: string,
  awayTeam: string,
  feedsInto: string | null = null,
  feedsIntoSide: "home" | "away" | null = null
): Match {
  return {
    id,
    phase,
    group: null,
    homeTeam,
    awayTeam,
    kickoff: new Date("2099-06-28T19:00:00Z"),
    result: null,
    score: null,
    locked: false,
    bracketSlot: id,
    feedsInto,
    feedsIntoSide,
  };
}

const game: Game = {
  id: "schedinone-golden-plus-2026",
  name: "Schedinone Golden Plus 2026",
  entryFee: 0,
  admins: [],
  accessCode: "",
  phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
  currentPhase: "sedicesimi",
  topScorer: null,
  winner: null,
  mode: "golden-plus",
  predictionMode: "qualifier",
  specialPicksEnabled: false,
};

const matches: Match[] = [
  bracketMatch("r32-01", "sedicesimi", "Spagna", "Corea del Sud", "r16-01", "home"),
  bracketMatch("r32-02", "sedicesimi", "Francia", "Giappone", "r16-01", "away"),
  bracketMatch("r16-01", "ottavi", "Vincente r32-01", "Vincente r32-02", "qf-01", "home"),
  bracketMatch("qf-01", "quarti", "Vincente r16-01", "Vincente r16-02", null, null),
];

const player: Player = {
  id: "player-1",
  name: "Italia",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: {},
  topScorerPick: "",
  winnerPick: "",
  points: 0,
  paid: true,
  scheduleStatus: "bozza",
};

function renderPage(props: Partial<React.ComponentProps<typeof GoldenBracketPage>> = {}) {
  return render(
    <MemoryRouter>
      <GoldenBracketPage game={game} player={player} matches={matches} gameId={game.id} {...props} />
    </MemoryRouter>
  );
}

describe("GoldenBracketPage", () => {
  beforeEach(() => {
    scheduleMocks.saveSchedule.mockClear();
    scheduleMocks.saveSchedule.mockResolvedValue({ ok: true, scheduleStatus: "bozza" });
    setViewport(1200);
  });

  it("renders the tennis-style bracket on desktop", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /tabellone golden plus/i })).toBeInTheDocument();
    expect(screen.getByText(/vista tabellone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scegli spagna per r32-01/i })).toBeInTheDocument();
  });

  it("links to the separate Golden Plus leaderboard", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /classifica golden/i })).toHaveAttribute(
      "href",
      "/golden-plus/classifica"
    );
  });

  it("keeps the submit button visible even while picks are still missing", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /invia tabellone al comitato/i })).toBeDisabled();
    expect(screen.getByText(/mancano 4 scelte/i)).toBeInTheDocument();
  });

  it("keeps the desktop bracket inside a horizontal touch scroller", () => {
    renderPage();

    const scroller = screen.getByTestId("golden-bracket-scroll");

    expect(scroller).toHaveClass("overflow-x-auto");
    expect(scroller).toHaveClass("max-w-full");
  });

  it("renders the guided quadrant view on mobile without a desktop first render", () => {
    setViewport(390);

    renderPage();

    expect(screen.getByText(/quadrante guidato/i)).toBeInTheDocument();
    expect(screen.queryByText(/vista tabellone/i)).not.toBeInTheDocument();
  });

  it("saves a qualifier pick by team name without special picks", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /scegli spagna per r32-01/i }));

    await waitFor(() => expect(scheduleMocks.saveSchedule).toHaveBeenCalledTimes(1));
    expect(scheduleMocks.saveSchedule).toHaveBeenCalledWith({
      gameId: game.id,
      predictions: { "r32-01": "1" },
      topScorerPick: "",
      winnerPick: "",
      submit: false,
    });
    expect(screen.getByRole("button", { name: /scegli spagna per r16-01/i })).toBeInTheDocument();
  });

  it("clears dependent downstream picks when an upstream team changes", async () => {
    const playerWithBracket: Player = {
      ...player,
      predictions: {
        "r32-01": "1",
        "r16-01": "1",
      },
    };

    renderPage({ player: playerWithBracket });

    fireEvent.click(screen.getByRole("button", { name: /scegli corea del sud per r32-01/i }));

    await waitFor(() => expect(scheduleMocks.saveSchedule).toHaveBeenCalledTimes(1));
    expect(scheduleMocks.saveSchedule).toHaveBeenCalledWith({
      gameId: game.id,
      predictions: { "r32-01": "2" },
      topScorerPick: "",
      winnerPick: "",
      submit: false,
    });
  });
});
