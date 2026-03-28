import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchCard from "../MatchCard";
import type { Match, Sign } from "../../lib/types";

const match: Match = {
  id: "m1", phase: "gironi", group: "A", homeTeam: "🇮🇹 Italia", awayTeam: "🇧🇷 Brasile",
  kickoff: new Date("2026-06-11T18:00:00Z"), result: null, score: null, locked: false,
};

describe("MatchCard", () => {
  it("renders team names", () => {
    render(<MatchCard match={match} prediction={null} onPredict={vi.fn()} disabled={false} />);
    expect(screen.getByText((content) => content.includes("Italia"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Brasile"))).toBeInTheDocument();
  });
  it("renders 1, X, 2 buttons", () => {
    render(<MatchCard match={match} prediction={null} onPredict={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "X" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });
  it("calls onPredict when button is clicked", () => {
    const onPredict = vi.fn();
    render(<MatchCard match={match} prediction={null} onPredict={onPredict} disabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(onPredict).toHaveBeenCalledWith("m1", "1");
  });
  it("highlights selected prediction", () => {
    render(<MatchCard match={match} prediction="X" onPredict={vi.fn()} disabled={false} />);
    const xBtn = screen.getByRole("button", { name: "X" });
    expect(xBtn.className).toContain("selected");
  });
  it("disables buttons when match is locked", () => {
    const lockedMatch = { ...match, locked: true };
    render(<MatchCard match={lockedMatch} prediction={null} onPredict={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled();
  });
  it("shows score when available", () => {
    const finishedMatch = { ...match, result: "2" as Sign, score: "1-3", locked: true };
    render(<MatchCard match={finishedMatch} prediction="2" onPredict={vi.fn()} disabled={false} />);
    expect(screen.getByText("1-3")).toBeInTheDocument();
  });
});
