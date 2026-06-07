import { describe, expect, it } from "vitest";
import {
  FCM_SW_SCOPE,
  isStaleRootMessagingRegistration,
} from "../messagingServiceWorker";

describe("messaging service worker registration", () => {
  it("uses a dedicated sub-scope so Firebase messaging does not replace the PWA worker", () => {
    expect(FCM_SW_SCOPE).toBe("/firebase-cloud-messaging-push-scope/");
  });

  it("detects old root-scope Firebase messaging workers without touching the PWA worker", () => {
    expect(
      isStaleRootMessagingRegistration(
        {
          scope: "https://schedinone-2026.web.app/",
          active: { scriptURL: "https://schedinone-2026.web.app/firebase-messaging-sw.js?projectId=x" },
        },
        "https://schedinone-2026.web.app"
      )
    ).toBe(true);

    expect(
      isStaleRootMessagingRegistration(
        {
          scope: "https://schedinone-2026.web.app/",
          active: { scriptURL: "https://schedinone-2026.web.app/sw.js" },
        },
        "https://schedinone-2026.web.app"
      )
    ).toBe(false);
  });
});
