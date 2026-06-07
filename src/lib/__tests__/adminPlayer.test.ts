import { describe, expect, it } from "vitest";
import { getAdminPlayerUid, getEffectivePlayerUid } from "../adminPlayer";
import type { Game } from "../types";

const game: Game = {
  id: "schedinone-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: ["admin-1", "admin-2"],
  adminPlayerUids: {
    "admin-1": "player-italia",
  },
  playerDeviceAliases: {
    "device-flowers-2": "player-flowers",
  },
  accessCode: "test",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

describe("admin player mapping", () => {
  it("returns the linked player uid for a mapped admin", () => {
    expect(getAdminPlayerUid(game, "admin-1")).toBe("player-italia");
  });

  it("does not return a player uid for an unmapped admin", () => {
    expect(getAdminPlayerUid(game, "admin-2")).toBeNull();
  });

  it("uses the linked player uid as the effective player uid", () => {
    expect(getEffectivePlayerUid(game, "admin-1")).toBe("player-italia");
    expect(getEffectivePlayerUid(game, "player-2")).toBe("player-2");
  });

  it("uses a linked player uid for authorized extra player devices", () => {
    expect(getEffectivePlayerUid(game, "device-flowers-2")).toBe("player-flowers");
  });
});
