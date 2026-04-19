import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { recalculatePoints } from "./calcPoints";
import { lockUpcomingMatches } from "./lockMatches";
import { fetchAndUpdateResults } from "./fetchResults";

admin.initializeApp();

// API-Football key stored as a secret — set with:
//   firebase functions:secrets:set FOOTBALL_API_KEY
const footballApiKey = defineSecret("FOOTBALL_API_KEY");

export const onMatchResultUpdate = onDocumentUpdated(
  "games/{gameId}/matches/{matchId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.result !== after.result) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

export const onGameUpdate = onDocumentUpdated(
  "games/{gameId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.topScorer !== after.topScorer || before.winner !== after.winner) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

export const scheduledLockMatches = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Rome" },
  async () => {
    await lockUpcomingMatches();
  }
);

export const scheduledFetchResults = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Europe/Rome",
    secrets: [footballApiKey],
  },
  async () => {
    const apiKey = footballApiKey.value();
    if (!apiKey) {
      logger.error("FOOTBALL_API_KEY not set");
      return;
    }
    await fetchAndUpdateResults(apiKey);
  }
);
