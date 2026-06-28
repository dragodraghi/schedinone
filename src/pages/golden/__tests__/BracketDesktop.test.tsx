import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BracketDesktop from "../BracketDesktop";
import type { Match, Phase } from "../../../lib/types";

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

describe("BracketDesktop", () => {
  it("aligns each round of 16 node beside the pair of round of 32 matches feeding it", () => {
    const matches: Match[] = [
      bracketMatch("r32-01", "sedicesimi", "South Africa", "Canada", "r16-01", "home"),
      bracketMatch("r32-02", "sedicesimi", "Netherlands", "Morocco", "r16-01", "away"),
      bracketMatch("r32-03", "sedicesimi", "Germany", "Paraguay", "r16-02", "home"),
      bracketMatch("r32-04", "sedicesimi", "France", "Sweden", "r16-02", "away"),
      bracketMatch("r16-01", "ottavi", "South Africa", "Netherlands", "qf-01", "home"),
      bracketMatch("r16-02", "ottavi", "Paraguay", "France", "qf-01", "away"),
      bracketMatch("qf-01", "quarti", "Vincente r16-01", "Vincente r16-02"),
    ];

    render(
      <BracketDesktop
        matches={matches}
        predictions={{ "r32-04": "1" }}
        onPick={vi.fn()}
        disabled={false}
      />
    );

    expect(screen.getByRole("button", { name: /scegli france per r16-02/i })).toBeInTheDocument();
    expect(screen.getByTestId("bracket-node-r32-03")).toHaveStyle("grid-row: 5 / span 2");
    expect(screen.getByTestId("bracket-node-r32-04")).toHaveStyle("grid-row: 7 / span 2");
    expect(screen.getByTestId("bracket-node-r16-02")).toHaveStyle("grid-row: 6 / span 2");
  });
});
