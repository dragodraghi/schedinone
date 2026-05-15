import * as admin from "firebase-admin";
import { getMaxLockLeadMs, isMatchClosed } from "./scheduleRules";

export async function lockUpcomingMatches() {
  const db = admin.firestore();
  const now = new Date();

  const gamesSnap = await db.collection("games").get();

  for (const gameDoc of gamesSnap.docs) {
    const gameData = gameDoc.data();
    const lockThreshold = new Date(now.getTime() + getMaxLockLeadMs(gameData));
    const matchesSnap = await db
      .collection(`games/${gameDoc.id}/matches`)
      .where("locked", "==", false)
      .where("kickoff", "<=", admin.firestore.Timestamp.fromDate(lockThreshold))
      .get();

    let batch = db.batch();
    let pendingWrites = 0;

    async function commitPending() {
      if (pendingWrites === 0) return;
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }

    for (const matchDoc of matchesSnap.docs) {
      if (!isMatchClosed(gameData, matchDoc.data(), now)) continue;
      batch.update(matchDoc.ref, { locked: true });
      pendingWrites++;
      if (pendingWrites >= 400) {
        await commitPending();
      }
    }
    await commitPending();
  }
}
