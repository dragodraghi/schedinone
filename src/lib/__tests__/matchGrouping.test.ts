import { describe, expect, it } from "vitest";
import { getChronologicalMatchDayGroups } from "../matchGrouping";
import type { Match } from "../types";

function match(id: string, kickoff: string): Match {
  return {
    id,
    phase: "gironi",
    group: id.toUpperCase(),
    homeTeam: `Casa ${id}`,
    awayTeam: `Trasferta ${id}`,
    kickoff: new Date(kickoff),
    result: null,
    score: null,
    locked: false,
  };
}

describe("getChronologicalMatchDayGroups", () => {
  it("groups matches by Italian calendar day and sorts them by kickoff", () => {
    const groups = getChronologicalMatchDayGroups([
      match("late", "2026-06-13T20:00:00Z"),
      match("mid", "2026-06-12T11:00:00Z"),
      match("early", "2026-06-12T10:00:00Z"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toMatch(/12 giugno/i);
    expect(groups[0].matches.map((item) => item.id)).toEqual(["early", "mid"]);
    expect(groups[1].label).toMatch(/13 giugno/i);
    expect(groups[1].matches.map((item) => item.id)).toEqual(["late"]);
  });
});
