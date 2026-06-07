import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

describe("Schedinone functions deployment scope", () => {
  it("does not export TUSK functions from the deploy entrypoint", () => {
    const index = readFileSync(join(root, "functions", "src", "index.ts"), "utf8");

    expect(index.toLowerCase()).not.toContain("tusk");
  });

  it("exports the Schedinone chat message deletion callable", () => {
    const index = readFileSync(join(root, "functions", "src", "index.ts"), "utf8");

    expect(index).toContain('export { deleteChatMessage } from "./deleteChatMessage";');
  });

  it("does not require TUSK push dependencies for the Schedinone functions package", () => {
    const pkg = readJson<{ dependencies?: Record<string, string> }>("functions/package.json");

    expect(pkg.dependencies ?? {}).not.toHaveProperty("web-push");
    expect(pkg.dependencies ?? {}).not.toHaveProperty("@types/web-push");
  });

  it("keeps parked TUSK sources out of the functions TypeScript build", () => {
    const tsconfig = readJson<{ exclude?: string[] }>("functions/tsconfig.json");

    expect(tsconfig.exclude ?? []).toContain("src/tusk*.ts");
    expect(tsconfig.exclude ?? []).toContain("src/submitTuskIscrizione.ts");
  });
});
