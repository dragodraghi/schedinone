import type { CallableOptions } from "firebase-functions/v2/https";

// firebase-functions v5 currently does not copy `invoker` into the endpoint
// manifest for onCall functions, but keeping it here is harmless and preserves
// the intended config if the SDK starts honoring it after an upgrade.
export const publicCallableOptions = {
  region: "europe-west1",
  cors: true,
  invoker: "public",
} satisfies CallableOptions;
