import * as admin from "firebase-admin";

const db = admin.firestore();

// Lock predictions 1 day (24h) before kickoff. Keep in sync with
// SchedinaPage UI message "I pronostici si chiudono 1 giorno prima".
const LOCK_LEAD_MS = 24 * 60 * 60 * 1000;

export async function lockUpcomingMatches() {
  const now = new Date();
  const lockThreshold = new Date(now.getTime() + LOCK_LEAD_MS);

  const gamesSnap = await db.collection("games").get();

  for (const gameDoc of gamesSnap.docs) {
    const matchesSnap = await db
      .collection(`games/${gameDoc.id}/matches`)
      .where("locked", "==", false)
      .where("kickoff", "<=", admin.firestore.Timestamp.fromDate(lockThreshold))
      .get();

    const batch = db.batch();
    for (const matchDoc of matchesSnap.docs) {
      batch.update(matchDoc.ref, { locked: true });
    }
    await batch.commit();
  }
}
