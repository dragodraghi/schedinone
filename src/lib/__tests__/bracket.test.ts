import { describe, expect, it } from "vitest";
import {
  applyBracketPredictions,
  isPlaceholderTeam,
  selectedTeam,
  withBracketPick,
} from "../bracket";
import type { Match, Phase, QualifierSign } from "../types";

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
    kickoff: new Date("2026-06-28T19:00:00Z"),
    result: null,
    score: null,
    locked: false,
    bracketSlot: id,
    feedsInto,
    feedsIntoSide,
  };
}

const matches: Match[] = [
  bracketMatch("r32-01", "sedicesimi", "Spagna", "Corea del Sud", "r16-01", "home"),
  bracketMatch("r32-02", "sedicesimi", "Francia", "Giappone", "r16-01", "away"),
  bracketMatch("r16-01", "ottavi", "Vincente r32-01", "Vincente r32-02", "qf-01", "home"),
  bracketMatch("qf-01", "quarti", "Vincente r16-01", "Vincente r16-02", null, null),
  bracketMatch("r32-03", "sedicesimi", "Brasile", "Messico", "r16-02", "home"),
];

describe("bracket utilities", () => {
  it("selects the home or away team from a qualifier pick", () => {
    expect(selectedTeam(matches[0], "1")).toBe("Spagna");
    expect(selectedTeam(matches[0], "2")).toBe("Corea del Sud");
  });

  it("detects seeded placeholder teams", () => {
    expect(isPlaceholderTeam("TBD r32-01 Casa")).toBe(true);
    expect(isPlaceholderTeam("Da definire r32-01")).toBe(true);
    expect(isPlaceholderTeam("Spagna")).toBe(false);
  });

  it("advances selected teams into the next bracket slot", () => {
    const derived = applyBracketPredictions(matches, {
      "r32-01": "1",
      "r32-02": "2",
      "r16-01": "2",
    });

    expect(derived.find((match) => match.id === "r16-01")?.homeTeam).toBe("Spagna");
    expect(derived.find((match) => match.id === "r16-01")?.awayTeam).toBe("Giappone");
    expect(derived.find((match) => match.id === "qf-01")?.homeTeam).toBe("Giappone");
    expect(matches.find((match) => match.id === "r16-01")?.homeTeam).toBe("Vincente r32-01");
  });

  it("clears dependent picks when an upstream pick changes", () => {
    const next = withBracketPick(
      matches,
      {
        "r32-01": "1",
        "r16-01": "1",
        "qf-01": "1",
      },
      "r32-01",
      "2"
    );

    expect(next).toEqual({ "r32-01": "2" });
  });

  it("does not clear unrelated branch picks", () => {
    const next = withBracketPick(
      matches,
      {
        "r32-01": "1",
        "r32-03": "2",
      },
      "r32-01",
      null
    );

    expect(next).toEqual({ "r32-03": "2" satisfies QualifierSign });
  });
});
