import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { recalculatePoints } from "./calcPoints";
import { lockUpcomingMatches } from "./lockMatches";

admin.initializeApp();

/**
 * When the Comitato enters or corrects a match result, recompute every
 * player's total points.
 */
export const onMatchResultUpdate = onDocumentUpdated(
  { document: "games/{gameId}/matches/{matchId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.result !== after.result) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

/**
 * When the Comitato sets the tournament top scorer or winner, recompute
 * points. (Currently these don't grant points — see calcPoints.ts — but
 * keeping the trigger in case the rules evolve.)
 */
export const onGameUpdate = onDocumentUpdated(
  { document: "games/{gameId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.topScorer !== after.topScorer || before.winner !== after.winner) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

/**
 * Lock match predictions 24h before kickoff. Runs every 15 minutes.
 * Timezone is Europe/Rome so the schedule text is human-readable — the
 * actual lock logic uses UTC timestamps, so timezone doesn't affect correctness.
 */
export const scheduledLockMatches = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Rome", region: "europe-west1" },
  async () => {
    await lockUpcomingMatches();
  }
);

// NOTE: the API-Football automatic result fetcher has been removed — the
// free plan doesn't include WC 2026 season data, so the function had no
// real effect. The Comitato enters results manually from the admin panel;
// the onMatchResultUpdate trigger above then recalculates points instantly.

export { onMessageCreated } from "./onMessageCreated";
