import * as admin from "firebase-admin";

const db = admin.firestore();
const SIGN_SET = new Set(["1", "X", "2"]);
const MAX_PICK_LEN = 40;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizePick(value: unknown): string {
  const normalized = normalizeText(value);
  if (normalized.length > MAX_PICK_LEN) {
    throw new Error("pick-too-long");
  }
  return normalized;
}

function sanitizePredictions(raw: unknown): Record<string, "1" | "X" | "2"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const predictions: Record<string, "1" | "X" | "2"> = {};
  for (const [matchId, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedId = normalizeText(matchId);
    if (!normalizedId) {
      throw new Error("invalid-prediction-key");
    }
    if (!SIGN_SET.has(String(value))) {
      throw new Error("invalid-prediction-sign");
    }
    predictions[normalizedId] = value as "1" | "X" | "2";
  }

  return predictions;
}

export async function savePlayerSchedule(
  uid: string,
  gameId: string,
  rawPredictions: unknown,
  rawTopScorerPick: unknown,
  rawWinnerPick: unknown,
  submit = false
): Promise<{ scheduleStatus: "bozza" | "rifiutata" | "inviata" }> {
  if (!uid || !gameId) {
    throw new Error("missing-fields");
  }

  const predictions = sanitizePredictions(rawPredictions);
  const topScorerPick = sanitizePick(rawTopScorerPick);
  const winnerPick = sanitizePick(rawWinnerPick);

  const gameRef = db.doc(`games/${gameId}`);
  const playerRef = db.doc(`games/${gameId}/players/${uid}`);

  const [gameSnap, playerSnap, matchesSnap] = await Promise.all([
    gameRef.get(),
    playerRef.get(),
    db.collection(`games/${gameId}/matches`).get(),
  ]);

  if (!gameSnap.exists) {
    throw new Error("game-not-found");
  }
  if (!playerSnap.exists) {
    throw new Error("player-not-found");
  }

  const gameData = gameSnap.data() ?? {};
  const playerData = playerSnap.data() ?? {};
  const currentStatus = normalizeText(playerData.scheduleStatus) || "bozza";

  if (currentStatus !== "bozza" && currentStatus !== "rifiutata") {
    throw new Error("schedule-readonly");
  }

  const currentPhase = normalizeText(gameData.currentPhase);
  if (!currentPhase) {
    throw new Error("missing-phase");
  }

  const phaseMatches = matchesSnap.docs.filter((doc) => doc.data().phase === currentPhase);
  const phaseClosed = phaseMatches.some((doc) => {
    const data = doc.data();
    return data.locked === true || data.result !== null;
  });

  if (phaseClosed) {
    throw new Error("phase-closed");
  }

  if (submit) {
    const missingPrediction = phaseMatches.some((doc) => !predictions[doc.id]);
    if (missingPrediction || !topScorerPick || !winnerPick) {
      throw new Error("schedule-incomplete");
    }
  }

  const nextStatus = submit
    ? "inviata"
    : currentStatus === "rifiutata"
    ? "rifiutata"
    : "bozza";

  await playerRef.update({
    predictions,
    topScorerPick,
    winnerPick,
    scheduleStatus: nextStatus,
  });

  return { scheduleStatus: nextStatus };
}
