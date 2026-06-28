import { describe, expect, it } from "vitest";
import { buildWC2026Matches, countRealKickoffs } from "../worldcup2026";

describe("worldcup2026", () => {
  it("builds the 72 official group-stage matches", () => {
    const matches = buildWC2026Matches();

    expect(matches).toHaveLength(72);
    expect(countRealKickoffs()).toBe(72);
  });

  it("uses the official home/away order and kickoff for corrected fixtures", () => {
    const matches = buildWC2026Matches();
    const byId = new Map(matches.map((match) => [match.id, match]));

    expect(byId.get("gir-A-md2-02")).toMatchObject({
      homeTeam: "Messico",
      awayTeam: "Corea del Sud",
      group: "A",
    });
    expect(byId.get("gir-A-md2-02")?.kickoff.toISOString()).toBe("2026-06-19T01:00:00.000Z");

    expect(byId.get("gir-A-md3-03")).toMatchObject({
      homeTeam: "Repubblica Ceca",
      awayTeam: "Messico",
      group: "A",
    });
    expect(byId.get("gir-A-md3-03")?.kickoff.toISOString()).toBe("2026-06-25T01:00:00.000Z");

    expect(byId.get("gir-L-md3-03")).toMatchObject({
      homeTeam: "Panama",
      awayTeam: "Inghilterra",
      group: "L",
    });
    expect(byId.get("gir-L-md3-03")?.kickoff.toISOString()).toBe("2026-06-27T21:00:00.000Z");
  });

  it("uses the official Group E kickoff order from FIFA", () => {
    const matches = buildWC2026Matches();
    const byId = new Map(matches.map((match) => [match.id, match]));

    expect(byId.get("gir-E-md1-01")).toMatchObject({
      homeTeam: "Germania",
      awayTeam: "Curaçao",
      group: "E",
    });
    expect(byId.get("gir-E-md1-01")?.kickoff.toISOString()).toBe("2026-06-14T17:00:00.000Z");

    expect(byId.get("gir-E-md1-23")).toMatchObject({
      homeTeam: "Costa d'Avorio",
      awayTeam: "Ecuador",
      group: "E",
    });
    expect(byId.get("gir-E-md1-23")?.kickoff.toISOString()).toBe("2026-06-14T23:00:00.000Z");
  });
});
