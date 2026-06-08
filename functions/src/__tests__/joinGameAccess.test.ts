import { describe, expect, it } from "vitest";
import { isReservedPlayerName, resolveExtraDeviceLinkTarget } from "../joinGameAccess";

describe("resolveExtraDeviceLinkTarget", () => {
  it("links a different anonymous uid to a multi-device player", () => {
    expect(
      resolveExtraDeviceLinkTarget("new-device-uid", "player-flowers", {
        multiDeviceEnabled: true,
      })
    ).toBe("player-flowers");
  });

  it("does not link a different uid when multi-device is disabled", () => {
    expect(
      resolveExtraDeviceLinkTarget("new-device-uid", "player-flowers", {
        multiDeviceEnabled: false,
        scheduleStatus: "inviata",
      })
    ).toBeNull();
  });

  it("links a different anonymous uid to a fresh draft player", () => {
    expect(
      resolveExtraDeviceLinkTarget("new-device-uid", "player-aquile", {
        multiDeviceEnabled: false,
        scheduleStatus: "bozza",
        predictions: {},
        topScorerPick: "",
        winnerPick: "",
      })
    ).toBe("player-aquile");
  });

  it("does not link a draft player that already has predictions", () => {
    expect(
      resolveExtraDeviceLinkTarget("new-device-uid", "player-aquile", {
        multiDeviceEnabled: false,
        scheduleStatus: "bozza",
        predictions: { m1: "1" },
        topScorerPick: "",
        winnerPick: "",
      })
    ).toBeNull();
  });

  it("does not link a draft player that already has special picks", () => {
    expect(
      resolveExtraDeviceLinkTarget("new-device-uid", "player-aquile", {
        multiDeviceEnabled: false,
        scheduleStatus: "bozza",
        predictions: {},
        topScorerPick: "Mbappe",
        winnerPick: "",
      })
    ).toBeNull();
  });

  it("does not link when the matching player already is the current uid", () => {
    expect(
      resolveExtraDeviceLinkTarget("player-flowers", "player-flowers", {
        multiDeviceEnabled: true,
      })
    ).toBeNull();
  });
});

describe("isReservedPlayerName", () => {
  it("blocks committee/admin names from the player login", () => {
    expect(isReservedPlayerName("comitato")).toBe(true);
    expect(isReservedPlayerName(" Comitato ")).toBe(true);
    expect(isReservedPlayerName("admin")).toBe(true);
    expect(isReservedPlayerName("amministratore")).toBe(true);
  });

  it("blocks email-like values in the team-name field", () => {
    expect(isReservedPlayerName("comitato@schedinone.local")).toBe(true);
  });

  it("allows normal team names", () => {
    expect(isReservedPlayerName("Italia")).toBe(false);
    expect(isReservedPlayerName("THE FLOWERS")).toBe(false);
    expect(isReservedPlayerName("Sorelle Dessanti")).toBe(false);
  });
});
