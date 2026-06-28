import { describe, expect, it } from "vitest";
import * as bcrypt from "bcryptjs";
import { verifyAccessCode } from "../joinGameAccessCode";

describe("verifyAccessCode", () => {
  it("accepts the private bcrypt hash", async () => {
    const hash = await bcrypt.hash("GIOCA2026", 4);

    await expect(verifyAccessCode("GIOCA2026", hash)).resolves.toBe(true);
  });

  it("does not fall back to any plaintext legacy game code", async () => {
    await expect(verifyAccessCode("GIOCA2026", undefined, "GIOCA2026")).resolves.toBe(false);
  });
});
