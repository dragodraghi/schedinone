import * as admin from "firebase-admin";

export interface RecalculatePointsReport {
  playersUpdated: number;
  matchesCounted: number;
}

export function publicPlayerData(data: admin.firestore.DocumentData, points: number) {
  const status =
    data.scheduleStatus === "inviata" ||
    data.scheduleStatus === "accettata" ||
    data.scheduleStatus === "rifiutata"
      ? data.scheduleStatus
      : "bozza";
  const accepted = status === "accettata";

  return {
    name: typeof data.name === "string" ? data.name : "Giocatore",
    joinedAt: data.joinedAt ?? null,
    points,
    paid: data.paid === true,
    scheduleStatus: status,
    predictions:
      accepted && data.predictions && typeof data.predictions === "object"
        ? data.predictions
        : {},
    topScorerPick: accepted && typeof data.topScorerPick === "string" ? data.topScorerPick : "",
    winnerPick: accepted && typeof data.winnerPick === "string" ? data.winnerPick : "",
  };
}

/**
 * Compute each player's current leaderboard rank, replicating the frontend
 * ordering in src/lib/playerOrdering.ts: points desc -> joinedAt asc ->
 * name (it-IT) -> id. Ties share the same rank (the next rank is skipped),
 * exactly like rankPlayersForLeaderboard.
 */
export function computeRanksById(
  players: Array<{ id: string; data: admin.firestore.DocumentData }>
): Record<string, number> {
  const joinedMillis = (data: admin.firestore.DocumentData): number => {
    const ts = data.joinedAt;
    if (ts && typeof ts.toMillis === "function") return ts.toMillis();
    return 0;
  };

  const sorted = [...players].sort((a, b) => {
    const pointsDiff = Number(b.data.points ?? 0) - Number(a.data.points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const joinedDiff = joinedMillis(a.data) - joinedMillis(b.data);
    if (joinedDiff !== 0) return joinedDiff;

    const nameA = typeof a.data.name === "string" ? a.data.name : "";
    const nameB = typeof b.data.name === "string" ? b.data.name : "";
    const nameDiff = nameA.localeCompare(nameB, "it-IT", { sensitivity: "base" });
    if (nameDiff !== 0) return nameDiff;

    return a.id.localeCompare(b.id, "it-IT", { sensitivity: "base" });
  });

  const ranks: Record<string, number> = {};
  let currentRank = 0;
  let lastPoints: number | null = null;

  sorted.forEach((player, index) => {
    const points = Number(player.data.points ?? 0);
    if (lastPoints === null || points !== lastPoints) {
      currentRank = index + 1;
      lastPoints = points;
    }
    ranks[player.id] = currentRank;
  });

  return ranks;
}

export function calculatePlayerPoints(
  playerData: admin.firestore.DocumentData,
  matches: Array<{ id: string; result: string }>
): number {
  const eligible = playerData.scheduleStatus === "accettata" || playerData.scheduleStatus === "inviata";
  if (!eligible) return 0;

  const predictions =
    playerData.predictions && typeof playerData.predictions === "object"
      ? (playerData.predictions as Record<string, unknown>)
      : {};

  return matches.filter((match) => predictions[match.id] === match.result).length;
}

export async function recalculatePoints(gameId: string): Promise<RecalculatePointsReport> {
  const db = admin.firestore();
  const playersSnap = await db.collection(`games/${gameId}/players`).get();
  const matchesSnap = await db.collection(`games/${gameId}/matches`).where("result", "!=", null).get();
  const gameDoc = await db.doc(`games/${gameId}`).get();
  const gameData = gameDoc.data();

  const matches = matchesSnap.docs.map((d) => ({
    id: d.id,
    result: d.data().result as string,
  }));

  // Snapshot the leaderboard ranks BEFORE recalculating, so we can record
  // each player's previous position and show movement arrows in the UI.
  const oldRankById = computeRanksById(
    playersSnap.docs.map((d) => ({ id: d.id, data: d.data() }))
  );

  let batch = db.batch();
  let pendingWrites = 0;
  let playersUpdated = 0;

  async function commitPending() {
    if (pendingWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  }

  for (const playerDoc of playersSnap.docs) {
    const data = playerDoc.data();

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
    const points = calculatePlayerPoints(data, matches);
    // gameData intentionally unused here for scoring (see note above)
    void gameData;

    if (Number(data.points ?? 0) !== points) {
      batch.update(playerDoc.ref, { points });
      pendingWrites++;
      playersUpdated++;
      if (pendingWrites >= 400) {
        await commitPending();
      }
    }

    batch.set(db.doc(`games/${gameId}/publicPlayers/${playerDoc.id}`), publicPlayerData(data, points), {
      merge: true,
    });
    pendingWrites++;
    if (pendingWrites >= 400) {
      await commitPending();
    }
  }

  // Only freeze the "previous rank" snapshot when this recalc actually
  // changed the standings. Recalcs that change nothing (e.g. the redundant
  // trigger that fires alongside the manual callable, or a result re-saved
  // identically) leave previousRank untouched, so the arrows stay stable.
  if (playersUpdated > 0) {
    for (const playerDoc of playersSnap.docs) {
      const previousRank = oldRankById[playerDoc.id];
      if (previousRank === undefined) continue;
      if (Number(playerDoc.data().previousRank ?? NaN) === previousRank) continue;
      batch.update(playerDoc.ref, { previousRank });
      pendingWrites++;
      if (pendingWrites >= 400) {
        await commitPending();
      }
    }
  }

  await commitPending();

  return { playersUpdated, matchesCounted: matches.length };
}
