import { describe, expect, it } from "vitest";
import {
  buildGoldenAccessRequestMessage,
  isNewPendingGoldenAccessRequest,
} from "../goldenAccessRequest";

describe("goldenAccessRequest", () => {
  it("detects newly created pending Golden Plus requests", () => {
    expect(
      isNewPendingGoldenAccessRequest(undefined, {
        status: "pending",
        type: "new-request",
        displayName: "Team Golden",
      })
    ).toBe(true);
    expect(
      isNewPendingGoldenAccessRequest(
        { status: "pending", type: "new-request", displayName: "Team Golden" },
        { status: "pending", type: "new-request", displayName: "Team Golden" }
      )
    ).toBe(false);
    expect(
      isNewPendingGoldenAccessRequest(undefined, {
        status: "approved",
        type: "new-request",
        displayName: "Team Golden",
      })
    ).toBe(false);
  });

  it("builds the committee chat message for a Golden Plus request", () => {
    expect(
      buildGoldenAccessRequestMessage({
        displayName: "Team Golden",
        contact: "team@example.test",
      })
    ).toBe(
      "Richiesta Golden Plus da Team Golden\nContatto: team@example.test\nApri Admin > Golden Plus per approvare o rifiutare."
    );
  });
});
