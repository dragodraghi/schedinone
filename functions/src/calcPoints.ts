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
    const eligible = data.scheduleStatus === "accettata" || data.scheduleStatus === "inviata";
    if (eligible) {
      const predictions = (data.predictions ?? {}) as Record<string, string>;

      for (const match of matches) {
        if (predictions[match.id] === match.result) points++;
      }

      if (gameData?.topScorer && data.topScorerPick === gameData.topScorer) points++;
      if (gameData?.winner && data.winnerPick === gameData.winner) points++;
    }

    batch.update(playerDoc.ref, { points });
  }

  await batch.commit();
}
