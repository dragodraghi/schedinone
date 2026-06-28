import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  kickoff: new Date("2026-06-20T18:00:00Z"),
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

function firstText(name: string): HTMLElement {
  const element = screen.getAllByText(name)[0];
  if (!element) throw new Error(`Missing text ${name}`);
  return element;
}

describe("SchedinaPage prediction editing", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("non cancella una scelta appena selezionata quando arriva una bozza remota vecchia", () => {
    const emptyDraftPlayer = { ...player, predictions: {}, topScorerPick: "", winnerPick: "" };
    const { rerender } = render(
      <SchedinaPage game={game} player={emptyDraftPlayer} matches={[match]} gameId="schedinone-2026" />
    );

    fireEvent.click(screen.getByRole("button", { name: "1" }));

    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-pressed", "true");

    rerender(
      <SchedinaPage
        game={game}
        player={{ ...emptyDraftPlayer, predictions: {} }}
        matches={[match]}
        gameId="schedinone-2026"
      />
    );

    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("removes an already selected prediction when the same sign is clicked again", () => {
    render(<SchedinaPage game={game} player={player} matches={[match]} gameId="schedinone-2026" />);

    expect(screen.getByText("1/1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancella pronostico/i }));

    expect(screen.getByText("0/1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mancano 1 pronostico/i })).toBeDisabled();
  });

  it("mostra le partite in ordine cronologico anche se appartengono a gironi diversi", () => {
    render(
      <SchedinaPage
        game={game}
        player={{ ...player, predictions: {}, topScorerPick: "", winnerPick: "" }}
        matches={[
          makeMatch("c1", "C", "2026-06-13T22:00:00Z"),
          makeMatch("a1", "A", "2026-06-12T11:00:00Z"),
          makeMatch("b1", "B", "2026-06-12T10:00:00Z"),
          makeMatch("d1", "D", "2026-06-13T01:00:00Z"),
        ]}
        gameId="schedinone-2026"
      />
    );

    expect(screen.getAllByText(/12 giugno/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/13 giugno/i).length).toBeGreaterThan(0);

    expectBefore(firstText("Casa B"), firstText("Casa A"));
    expectBefore(firstText("Casa A"), firstText("Casa D"));
    expectBefore(firstText("Casa D"), firstText("Casa C"));
  });

  it("monta la conferma invio fuori dal contenitore della schedina", () => {
    const { container } = render(<SchedinaPage game={game} player={player} matches={[match]} gameId="schedinone-2026" />);

    fireEvent.click(screen.getByRole("button", { name: /salva e invia al comitato/i }));

    const title = screen.getByRole("heading", { name: /conferma invio/i });
    expect(document.body).toContainElement(title);
    expect(container).not.toContainElement(title);
  });
});
