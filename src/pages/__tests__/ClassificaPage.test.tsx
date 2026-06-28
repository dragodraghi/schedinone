import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ClassificaPage from "../ClassificaPage";
import type { Game, Player } from "../../lib/types";

const game: Game = {
  id: "schedinone-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: [],
  accessCode: "",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

function player(overrides: Partial<Player>): Player {
  return {
    id: "p1",
    name: "Team",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: true,
    scheduleStatus: "accettata",
    ...overrides,
  };
}

describe("ClassificaPage", () => {
  it("shows tied leaders as pari merito", () => {
    const first = player({ id: "first", name: "Prima Squadra", points: 10 });
    const tied = player({ id: "tied", name: "Seconda Squadra", points: 10 });
    const third = player({ id: "third", name: "Terza Squadra", points: 8 });

    render(
      <MemoryRouter>
        <ClassificaPage game={game} player={first} players={[first, tied, third]} />
      </MemoryRouter>
    );

    expect(screen.getByText("2 pari merito")).toBeInTheDocument();
    expect(screen.getByText("10 punti ciascuno")).toBeInTheDocument();
    expect(screen.queryByText("Prima Squadra")).toBeInTheDocument();
    expect(screen.queryByText("Seconda Squadra")).toBeInTheDocument();
  });

  it("renders a Golden Plus leaderboard for qualifier points", () => {
    const goldenGame: Game = {
      ...game,
      id: "schedinone-golden-plus-2026",
      name: "Schedinone Golden Plus",
      entryFee: 20,
      mode: "golden-plus",
      predictionMode: "qualifier",
      specialPicksEnabled: false,
      phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
      currentPhase: "sedicesimi",
    };
    const leader = player({ id: "leader", name: "THE FLOWERS", points: 4, paid: true });
    const second = player({ id: "second", name: "7 e Muzzo", points: 3, paid: true });

    render(
      <MemoryRouter>
        <ClassificaPage
          game={goldenGame}
          player={second}
          players={[second, leader]}
          title="Classifica Golden"
          kicker="Golden Plus"
          emptyDescription="Appena il Comitato inserisce i risultati, ogni passaggio turno indovinato vale 1 punto."
          showCompareLink={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /classifica golden/i })).toBeInTheDocument();
    expect(screen.getByText("Golden Plus")).toBeInTheDocument();
    expect(screen.getAllByText("THE FLOWERS").length).toBeGreaterThan(0);
    expect(screen.getByText("4 punti")).toBeInTheDocument();
    expect(screen.getByText((_content, node) => node?.textContent === "EUR 40")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /confronta squadre/i })).not.toBeInTheDocument();
  });
});
