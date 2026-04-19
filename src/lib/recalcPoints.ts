import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Recompute every player's `points` for the given game. Mirrors the
 * functions/src/calcPoints.ts logic but runs client-side so it doesn't
 * require a Blaze plan / Cloud Functions deploy.
 *
 * Firestore rules allow admins to update any player doc — this function
 * must therefore be invoked only by an admin (the UI should gate it).
 *
 * Rules (match the server-side function):
 *  - Players in "bozza" or "rifiutata" scheduleStatus always score 0
 *  - Players in "inviata" or "accettata" score 1 point per correctly
 *    guessed 1/X/2 match
 *  - Capocannoniere and Winner picks do NOT grant points (separate cash
 *    prizes handled offline)
 */
export async function recalcPointsClient(gameId: string): Promise<{
  playersUpdated: number;
  matchesCounted: number;
}> {
  const matchesSnap = await getDocs(collection(db, "games", gameId, "matches"));
  const playersSnap = await getDocs(collection(db, "games", gameId, "players"));

  const finishedMatches = matchesSnap.docs
    .filter((d) => d.data().result !== null && d.data().result !== undefined)
    .map((d) => ({ id: d.id, result: d.data().result as string }));

  const batch = writeBatch(db);
  let updated = 0;

  for (const playerDoc of playersSnap.docs) {
    const data = playerDoc.data();
    const status = data.scheduleStatus as string | undefined;
    const eligible = status === "accettata" || status === "inviata";
    let points = 0;

    if (eligible) {
      const predictions = (data.predictions ?? {}) as Record<string, string>;
      for (const m of finishedMatches) {
        if (predictions[m.id] === m.result) points++;
      }
    }

    // Only write if it actually changed, to minimize Firestore writes
    if ((data.points ?? 0) !== points) {
      batch.update(playerDoc.ref, { points });
      updated++;
    }
  }

  if (updated > 0) {
    await batch.commit();
  }

  return { playersUpdated: updated, matchesCounted: finishedMatches.length };
}
