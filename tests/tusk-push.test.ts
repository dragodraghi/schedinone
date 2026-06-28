import { describe, expect, it } from "vitest";
import {
  buildTuskPushPayload,
  isExpiredWebPushStatus,
  normalizeVapidPrivateKey,
  summarizeTuskPushResults,
  type TuskPushSendResult,
} from "../functions/src/tuskPushData";

describe("buildTuskPushPayload", () => {
  it("builds a notification for a new registration", () => {
    expect(buildTuskPushPayload("registration", {
      id: "reg-123",
      nome: "Mario Rossi",
      categoriaId: "challenge",
      box: "Bad Boars",
    })).toEqual({
      title: "Nuova iscrizione TUSK",
      body: "Mario Rossi - Challenge (M) - Bad Boars",
      url: "/giudici.html",
      tag: "tusk-nuova-iscrizione-reg-123",
      requireInteraction: true,
      renotify: true,
    });
  });

  it("builds a server push test notification", () => {
    const payload = buildTuskPushPayload("test", {});

    expect(payload.title).toBe("Test push TUSK");
    expect(payload.url).toBe("/giudici.html");
    expect(payload.body).toContain("Push server attiva");
  });
});

describe("summarizeTuskPushResults", () => {
  it("counts sent, failed, and expired subscriptions", () => {
    const results: TuskPushSendResult[] = [
      { ok: true },
      { ok: false, reason: "410 Gone", expired: true },
      { ok: false, reason: "429 Too Many Requests" },
    ];

    expect(summarizeTuskPushResults(results)).toEqual({
      sent: 1,
      failed: 2,
      deleted: 1,
      errors: ["410 Gone", "429 Too Many Requests"],
    });
  });
});

describe("normalizeVapidPrivateKey", () => {
  it("trims whitespace added by secret stdin setup", () => {
    expect(normalizeVapidPrivateKey(" abc123 \n")).toBe("abc123");
  });
});

describe("isExpiredWebPushStatus", () => {
  it("treats gone, not found, and invalid subscription responses as removable", () => {
    expect(isExpiredWebPushStatus(404)).toBe(true);
    expect(isExpiredWebPushStatus(410)).toBe(true);
    expect(isExpiredWebPushStatus(400)).toBe(true);
    expect(isExpiredWebPushStatus(429)).toBe(false);
    expect(isExpiredWebPushStatus(null)).toBe(false);
  });
});
