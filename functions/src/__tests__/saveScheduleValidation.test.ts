import { describe, expect, it } from "vitest";
import {
  resolveSpecialPicksForMode,
  sanitizePredictionsForMode,
} from "../saveSchedule";

describe("saveSchedule mode-aware validation", () => {
  it("rejects X predictions for qualifier games", () => {
    expect(() => sanitizePredictionsForMode({ "r32-01": "X" }, "qualifier")).toThrow(
      "Pronostici non validi."
    );
  });

  it("keeps X predictions valid for classic result games", () => {
    expect(sanitizePredictionsForMode({ m1: "X" }, "result")).toEqual({ m1: "X" });
  });

  it("does not require special picks when they are disabled", () => {
    expect(resolveSpecialPicksForMode(false, true, undefined, undefined)).toEqual({
      topScorerPick: "",
      winnerPick: "",
    });
  });

  it("still requires special picks for classic submit", () => {
    expect(() => resolveSpecialPicksForMode(true, true, "", "")).toThrow(
      "Scelte speciali mancanti."
    );
  });
});
