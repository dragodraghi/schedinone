import { describe, expect, it } from "vitest";
import { publicCallableOptions } from "../callableOptions";

describe("publicCallableOptions", () => {
  it("documents that callable functions need public invoker at Cloud Run level", () => {
    expect(publicCallableOptions).toMatchObject({
      region: "europe-west1",
      cors: true,
      invoker: "public",
    });
  });
});
