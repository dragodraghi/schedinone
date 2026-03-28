import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { recalculatePoints } from "./calcPoints";
import { lockUpcomingMatches } from "./lockMatches";
import { fetchAndUpdateResults } from "./fetchResults";

admin.initializeApp();

export const onMatchResultUpdate = functions.firestore
  .document("games/{gameId}/matches/{matchId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.result !== after.result) {
      await recalculatePoints(context.params.gameId);
    }
  });

export const onGameUpdate = functions.firestore
  .document("games/{gameId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.topScorer !== after.topScorer || before.winner !== after.winner) {
      await recalculatePoints(context.params.gameId);
    }
  });

export const scheduledLockMatches = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async () => {
    await lockUpcomingMatches();
  });

export const scheduledFetchResults = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async () => {
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
      console.error("FOOTBALL_API_KEY not set");
      return;
    }
    await fetchAndUpdateResults(apiKey);
  });
