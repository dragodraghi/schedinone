import { describe, expect, it } from "vitest";
import {
  canonicalPlayerNameKey,
  isReservedPlayerName,
  resolveJoinIdentity,
  resolveExtraDeviceLinkTarget,
} from "../joinGameAccess";

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

describe("canonicalPlayerNameKey", () => {
  it("treats apostrophe, space, accent and punctuation variants as the same team name", () => {
    const variants = ["S’anca", "S anca", "S'anca", "S.anca", " sanca "];

    expect(variants.map(canonicalPlayerNameKey)).toEqual([
      "sanca",
      "sanca",
      "sanca",
      "sanca",
      "sanca",
    ]);
  });

  it("keeps meaningful letters and numbers for normal team names", () => {
    expect(canonicalPlayerNameKey("Éire Abú 2026")).toBe("eireabu2026");
    expect(canonicalPlayerNameKey("A.C. Picchia 2026")).toBe("acpicchia2026");
  });
});

describe("resolveJoinIdentity", () => {
  it("uses approved Golden Plus access as the effective team name without a code", () => {
    expect(
      resolveJoinIdentity({
        gameMode: "golden-plus",
        name: "",
        code: "",
        accessData: {
          status: "approved",
          displayName: "Team Golden",
        },
      })
    ).toEqual({
      effectiveName: "Team Golden",
      skipCodeCheck: true,
    });
  });

  it("rejects Golden Plus access that is missing or not approved", () => {
    expect(() =>
      resolveJoinIdentity({
        gameMode: "golden-plus",
        name: "",
        code: "",
        accessData: { status: "pending", displayName: "Team Golden" },
      })
    ).toThrow("Accesso Golden Plus non autorizzato.");
  });

  it("keeps classic joins on team name plus required access code", () => {
    expect(
      resolveJoinIdentity({
        gameMode: "classic",
        name: "THE FLOWERS",
        code: "GIOCA2026",
      })
    ).toEqual({
      effectiveName: "THE FLOWERS",
      skipCodeCheck: false,
    });
  });

  it("rejects classic joins without an access code", () => {
    expect(() =>
      resolveJoinIdentity({
        gameMode: "classic",
        name: "THE FLOWERS",
        code: "",
      })
    ).toThrow("Parametri mancanti o non validi.");
  });
});
