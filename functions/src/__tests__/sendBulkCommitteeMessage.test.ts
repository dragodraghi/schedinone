import { describe, expect, it } from "vitest";
import { normalizeBulkCommitteeMessageRequest } from "../sendBulkCommitteeMessage";

describe("sendBulkCommitteeMessage", () => {
  it("normalizes a valid committee bulk message request", () => {
    expect(
      normalizeBulkCommitteeMessageRequest({
        gameId: "schedinone-2026",
        text: "  Comunicazione per tutti  ",
      })
    ).toEqual({
      gameId: "schedinone-2026",
      text: "Comunicazione per tutti",
    });
  });

  it("rejects an empty bulk message", () => {
    expect(normalizeBulkCommitteeMessageRequest({ gameId: "schedinone-2026", text: "   " })).toBeNull();
  });
});
