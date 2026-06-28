import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DashboardPage from "../DashboardPage";
import type { Game, Player } from "../../lib/types";

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

describe("DashboardPage", () => {
  it("shows committee actions at the top of the home page", () => {
    render(
      <MemoryRouter>
        <DashboardPage game={game} player={player} players={[player]} matches={[]} />
      </MemoryRouter>
    );

    const committeePanel = screen.getByLabelText("Comunicazioni Comitato");

    expect(committeePanel).toBeInTheDocument();
    expect(committeePanel).toContainElement(screen.getByRole("link", { name: /Avvisi Comitato/i }));
    expect(committeePanel).toContainElement(screen.getByRole("link", { name: /Contatta Comitato/i }));
    expect(screen.getByRole("link", { name: /Avvisi Comitato/i })).toHaveAttribute("href", "/bacheca");
    expect(screen.getByRole("link", { name: /Contatta Comitato/i })).toHaveAttribute("href", "/messaggi");
  });

  it("alerts the player when there is a service communication to read", () => {
    render(
      <MemoryRouter>
        <DashboardPage
          game={game}
          player={player}
          players={[player]}
          matches={[]}
          unreadAnnouncementCount={1}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Comunicazione da leggere/i })).toHaveAttribute("href", "/bacheca");
  });

  it("alerts the player when the committee replied privately", () => {
    render(
      <MemoryRouter>
        <DashboardPage
          game={game}
          player={player}
          players={[player]}
          matches={[]}
          unreadPrivateMessageCount={2}
          latestPrivateMessagePreview="Pagamento ricevuto"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Risposta del Comitato/i })).toHaveAttribute("href", "/messaggi");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/Pagamento ricevuto/i)).toBeInTheDocument();
  });

  it("shows a prominent Golden Plus entry point for approved players", () => {
    render(
      <MemoryRouter>
        <DashboardPage game={game} player={player} players={[player]} matches={[]} hasGoldenAccess />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /apri golden plus/i })).toHaveAttribute(
      "href",
      "/golden-plus"
    );
  });

  it("keeps the home page focused on committee, schedule and next match actions", () => {
    render(
      <MemoryRouter>
        <DashboardPage game={game} player={player} players={[player]} matches={[]} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: /Classifica/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Griglione/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Apri profilo/i })).not.toBeInTheDocument();
  });
});
