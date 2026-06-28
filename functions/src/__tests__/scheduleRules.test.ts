import { describe, expect, it } from "vitest";
import { getLockLeadHours, isMatchClosed } from "../scheduleRules";

function timestamp(date: string) {
  return {
    toDate: () => new Date(date),
  };
}

describe("functions scheduleRules", () => {
  it("uses phase-specific lock lead before the global value", () => {
    expect(
      getLockLeadHours(
        {
          lockLeadHours: 24,
          phaseLockLeadHours: { gironi: 0 },
        },
        "gironi"
      )
    ).toBe(0);
  });

  it("closes with the same kickoff-minus-lead logic used by the client", () => {
    const gameData = { lockLeadHours: 24 };
    const matchData = {
      phase: "gironi",
      locked: false,
      kickoff: timestamp("2026-06-11T19:00:00.000Z"),
    };

    expect(isMatchClosed(gameData, matchData, new Date("2026-06-10T18:59:59.999Z"))).toBe(false);
    expect(isMatchClosed(gameData, matchData, new Date("2026-06-10T19:00:00.000Z"))).toBe(true);
  });
});
