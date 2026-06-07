import { describe, expect, it } from "vitest";
import { summarizePushResponses } from "../messaging";

describe("summarizePushResponses", () => {
  it("reports token counts, successes, failures and tokens to delete", () => {
    const report = summarizePushResponses(3, 4, [
      { success: true },
      { success: false, error: { code: "messaging/registration-token-not-registered" } },
      { success: false, error: { code: "messaging/unavailable" } },
      { success: true },
    ]);

    expect(report).toEqual({
      uidCount: 3,
      tokenCount: 4,
      successCount: 2,
      failureCount: 2,
      deleteTokenIndexes: [1],
      failureCodes: {
        "messaging/registration-token-not-registered": 1,
        "messaging/unavailable": 1,
      },
    });
  });
});
