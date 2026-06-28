import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Golden Plus team names", () => {
  it("keeps seeded round of 32 teams in Italian", () => {
    const seedScript = readFileSync("scripts/seed-golden-plus-2026.mjs", "utf8");

    expect(seedScript).toContain('homeTeam: "Sudafrica"');
    expect(seedScript).toContain('homeTeam: "Francia"');
    expect(seedScript).toContain('awayTeam: "Svezia"');
    expect(seedScript).toContain(`homeTeam: "Costa d'Avorio"`);
    expect(seedScript).toContain('homeTeam: "Stati Uniti"');
    expect(seedScript).not.toContain('homeTeam: "South Africa"');
    expect(seedScript).not.toContain('homeTeam: "France"');
    expect(seedScript).not.toContain('homeTeam: "USA"');
  });
});
