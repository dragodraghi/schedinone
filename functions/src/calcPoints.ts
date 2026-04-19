import * as admin from "firebase-admin";

const db = admin.firestore();

export async function recalculatePoints(gameId: string) {
  const playersSnap = await db.collection(`games/${gameId}/players`).get();
  const matchesSnap = await db.collection(`games/${gameId}/matches`).where("result", "!=", null).get();
  const gameDoc = await db.doc(`games/${gameId}`).get();
  const gameData = gameDoc.data();

  const matches = matchesSnap.docs.map((d) => ({
    id: d.id,
    result: d.data().result as string,
  }));

  const batch = db.batch();

  for (const playerDoc of playersSnap.docs) {
    const data = playerDoc.data();
    let points = 0;

    // Count points for schedine that were submitted (inviata) OR accepted
    // (accettata). If the Comitato forgot to accept a schedina before the
    // first kickoff, we don't want the player to lose ALL their points.
    // Only "bozza" (never sent) and "rifiutata" (explicitly rejected) score 0.
    //
    // Rule clarification: Capocannoniere and Squadra Vincitrice do NOT give
    // game points. They are SEPARATE cash prizes split among the players
    // who guess them right. The Comitato handles those payouts offline.
    // The app only tracks predictions (topScorerPick, winnerPick) for
    // bookkeeping; it doesn't add them to the "points" leaderboard.
    const eligible = data.scheduleStatus === "accettata" || data.scheduleStatus === "inviata";
    if (eligible) {
      const predictions = (data.predictions ?? {}) as Record<string, string>;
      for (const match of matches) {
        if (predictions[match.id] === match.result) points++;
      }
    }
    // gameData intentionally unused here for scoring (see note above)
    void gameData;

    batch.update(playerDoc.ref, { points });
  }

  await batch.commit();
}
