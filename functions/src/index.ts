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
 * points. Currently these do not grant points (see calcPoints.ts), but the
 * trigger stays in place in case the rules evolve.
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
 * Timezone is Europe/Rome so the schedule text is human-readable; the
 * actual lock logic uses UTC timestamps, so timezone does not affect it.
 */
export const scheduledLockMatches = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Rome", region: "europe-west1" },
  async () => {
    await lockUpcomingMatches();
  }
);

// Automatic result sync is proposal-only: fetched scores are written to
// resultProposals and become official only after Comitato confirmation.

export { onMessageCreated } from "./onMessageCreated";
export { onAnnouncementPublished } from "./onAnnouncementPublished";
export { markThreadRead } from "./markThreadRead";
export { deleteChatMessage } from "./deleteChatMessage";
export { joinGame } from "./joinGame";
export { saveSchedule } from "./saveSchedule";
export { syncPublicPlayer } from "./syncPublicPlayer";
export { recalculatePointsNow } from "./recalculatePointsNow";
export {
  fetchResultProposalsNow,
  scheduledFetchResultProposals,
} from "./fetchResults";
