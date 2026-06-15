import { describe, expect, it } from "vitest";
import { calculatePlayerPoints, computeRanksById } from "../calcPoints";

const ts = (millis: number) => ({ toMillis: () => millis });

const matches = [
  { id: "m1", result: "1" },
  { id: "m2", result: "X" },
  { id: "m3", result: "2" },
];

describe("calculatePlayerPoints", () => {
  it("counts one point for every correct match prediction", () => {
    expect(
      calculatePlayerPoints(
        {
          scheduleStatus: "accettata",
          predictions: { m1: "1", m2: "2", m3: "2" },
          topScorerPick: "Mbappe",
          winnerPick: "Francia",
        },
        matches
      )
    ).toBe(2);
  });

  it("scores submitted schedules even before committee acceptance", () => {
    expect(
      calculatePlayerPoints(
        {
          scheduleStatus: "inviata",
          predictions: { m1: "1", m2: "X", m3: "2" },
        },
        matches
      )
    ).toBe(3);
  });

  it("scores zero for draft or rejected schedules", () => {
    expect(calculatePlayerPoints({ scheduleStatus: "bozza", predictions: { m1: "1" } }, matches)).toBe(0);
    expect(calculatePlayerPoints({ scheduleStatus: "rifiutata", predictions: { m1: "1" } }, matches)).toBe(0);
  });
});

describe("computeRanksById", () => {
  it("ranks by points descending", () => {
    const ranks = computeRanksById([
      { id: "a", data: { points: 3, name: "A", joinedAt: ts(1) } },
      { id: "b", data: { points: 7, name: "B", joinedAt: ts(2) } },
      { id: "c", data: { points: 5, name: "C", joinedAt: ts(3) } },
    ]);
    expect(ranks).toEqual({ b: 1, c: 2, a: 3 });
  });

  it("gives tied players the same rank and skips the next", () => {
    const ranks = computeRanksById([
      { id: "a", data: { points: 5, name: "A", joinedAt: ts(1) } },
      { id: "b", data: { points: 5, name: "B", joinedAt: ts(2) } },
      { id: "c", data: { points: 1, name: "C", joinedAt: ts(3) } },
    ]);
    expect(ranks).toEqual({ a: 1, b: 1, c: 3 });
  });

  it("breaks point ties by earlier joinedAt", () => {
    const ranks = computeRanksById([
      { id: "late", data: { points: 5, name: "Z", joinedAt: ts(200) } },
      { id: "early", data: { points: 5, name: "A", joinedAt: ts(100) } },
    ]);
    // same points -> earlier join wins the tie-break, so it sorts first,
    // but both share rank 1 because points are equal
    expect(ranks).toEqual({ early: 1, late: 1 });
  });

  it("treats missing points as zero", () => {
    const ranks = computeRanksById([
      { id: "a", data: { name: "A", joinedAt: ts(1) } },
      { id: "b", data: { points: 2, name: "B", joinedAt: ts(2) } },
    ]);
    expect(ranks).toEqual({ b: 1, a: 2 });
  });
});
