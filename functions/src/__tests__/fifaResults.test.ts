import { describe, expect, it } from "vitest";
import {
  buildFifaResultProposal,
  matchesTeam,
  scoreToSign,
  type FifaCalendarMatch,
} from "../fifaResults";

const finishedMatch: FifaCalendarMatch = {
  IdMatch: "400021443",
  MatchStatus: 0,
  Home: {
    TeamName: [{ Locale: "en-GB", Description: "Mexico" }],
    ShortClubName: "Mexico",
    Abbreviation: "MEX",
  },
  Away: {
    TeamName: [{ Locale: "en-GB", Description: "South Africa" }],
    ShortClubName: "South Africa",
    Abbreviation: "RSA",
  },
  HomeTeamScore: 2,
  AwayTeamScore: 1,
};

describe("FIFA official result parser", () => {
  it("matches app team names with FIFA official English names", () => {
    expect(matchesTeam("Messico", "Mexico")).toBe(true);
    expect(matchesTeam("Sudafrica", "South Africa")).toBe(true);
    expect(matchesTeam("RD Congo", "DR Congo")).toBe(true);
  });

  it("converts official FIFA final scores into committee proposals", () => {
    expect(
      buildFifaResultProposal(
        "gir-A-md1-01",
        { homeTeam: "Messico", awayTeam: "Sudafrica" },
        finishedMatch
      )
    ).toEqual({
      matchId: "gir-A-md1-01",
      homeTeam: "Messico",
      awayTeam: "Sudafrica",
      score: "2-1",
      result: "1",
      fixtureId: "400021443",
      apiStatus: "0",
      source: "fifa-official",
    });
  });

  it("ignores FIFA matches that are not finished yet", () => {
    expect(
      buildFifaResultProposal(
        "gir-A-md1-01",
        { homeTeam: "Messico", awayTeam: "Sudafrica" },
        { ...finishedMatch, MatchStatus: 1, HomeTeamScore: null, AwayTeamScore: null }
      )
    ).toBeNull();
  });

  it("computes the 1X2 sign from the score", () => {
    expect(scoreToSign(1, 0)).toBe("1");
    expect(scoreToSign(1, 1)).toBe("X");
    expect(scoreToSign(0, 1)).toBe("2");
  });
});
