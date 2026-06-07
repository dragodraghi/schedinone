import { describe, expect, it } from "vitest";
import { resolveSchedulePlayerUid } from "../saveScheduleAuth";

const gameData = {
  admins: ["admin-1", "admin-2"],
  adminPlayerUids: {
    "admin-1": "player-italia",
  },
  playerDeviceAliases: {
    "device-flowers-2": "player-flowers",
  },
};

describe("resolveSchedulePlayerUid", () => {
  it("uses the anonymous uid for regular players", () => {
    expect(resolveSchedulePlayerUid("player-1", "anonymous", gameData)).toBe("player-1");
  });

  it("blocks anonymous admin users", () => {
    expect(resolveSchedulePlayerUid("admin-1", "anonymous", gameData)).toBeNull();
  });

  it("uses the linked player uid for authorized anonymous player devices", () => {
    expect(resolveSchedulePlayerUid("device-flowers-2", "anonymous", gameData)).toBe("player-flowers");
  });

  it("uses the linked player uid for mapped admin accounts", () => {
    expect(resolveSchedulePlayerUid("admin-1", "password", gameData)).toBe("player-italia");
  });

  it("blocks admin accounts without a linked player uid", () => {
    expect(resolveSchedulePlayerUid("admin-2", "password", gameData)).toBeNull();
  });

  it("blocks non-anonymous non-admin accounts", () => {
    expect(resolveSchedulePlayerUid("player-1", "password", gameData)).toBeNull();
  });
});
