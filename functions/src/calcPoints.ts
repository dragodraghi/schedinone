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
    const predictions = (data.predictions ?? {}) as Record<string, string>;
    let points = 0;

    for (const match of matches) {
      if (predictions[match.id] === match.result) points++;
    }

    if (gameData?.topScorer && data.topScorerPick === gameData.topScorer) points++;
    if (gameData?.winner && data.winnerPick === gameData.winner) points++;

    batch.update(playerDoc.ref, { points });
  }

  await batch.commit();
}
