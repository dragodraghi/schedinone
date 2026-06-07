import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Schedinone production script safety", () => {
  it("requires explicit apply and fee arguments before changing entryFee", () => {
    const source = readFileSync(join(root, "scripts", "set-entry-fee.mjs"), "utf8");

    expect(source).toContain("--apply");
    expect(source).toContain("--fee=");
    expect(source).not.toContain("update({ entryFee: 50 })");
  });

  it("keeps multi-device enabling behind an explicit apply flag", () => {
    const source = readFileSync(join(root, "scripts", "enable-multi-device-players.mjs"), "utf8");

    expect(source).toContain("--apply");
    expect(source).toContain("Dry run soltanto");
    expect(source).toContain("multiDeviceEnabled: true");
  });
});
