/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PDF export styles", () => {
  it("keeps Griglione dark headers readable instead of forcing black text", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

    expect(css).toContain('body.pdf-export [data-griglione-print="true"] .griglione-dark-cell');
    expect(css).toContain("color: #ffffff !important");
  });
});
