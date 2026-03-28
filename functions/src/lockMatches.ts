import * as admin from "firebase-admin";

const db = admin.firestore();

export async function lockUpcomingMatches() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const gamesSnap = await db.collection("games").get();

  for (const gameDoc of gamesSnap.docs) {
    const matchesSnap = await db
      .collection(`games/${gameDoc.id}/matches`)
      .where("locked", "==", false)
      .where("kickoff", "<=", admin.firestore.Timestamp.fromDate(oneHourFromNow))
      .get();

    const batch = db.batch();
    for (const matchDoc of matchesSnap.docs) {
      batch.update(matchDoc.ref, { locked: true });
    }
    await batch.commit();
  }
}
