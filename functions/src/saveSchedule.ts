import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { isMatchClosed, requireCurrentPhase } from "./scheduleRules";

type Sign = "1" | "X" | "2";

const MAX_PREDICTIONS = 150;
const MAX_PICK_LEN = 40;
function isSign(value: unknown): value is Sign {
  return value === "1" || value === "X" || value === "2";
}

function sanitizePredictions(value: unknown): Record<string, Sign> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Pronostici non validi.");
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_PREDICTIONS) {
    throw new HttpsError("invalid-argument", "Troppi pronostici.");
  }

  const out: Record<string, Sign> = {};
  for (const [matchId, sign] of entries) {
    if (!matchId || matchId.length > 120 || !isSign(sign)) {
      throw new HttpsError("invalid-argument", "Pronostici non validi.");
    }
    out[matchId] = sign;
  }
  return out;
}

function sanitizePick(value: unknown, required: boolean): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Scelta speciale non valida.");
  }
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new HttpsError("invalid-argument", "Scelte speciali mancanti.");
  }
  if (trimmed.length > MAX_PICK_LEN) {
    throw new HttpsError("invalid-argument", "Scelta speciale troppo lunga.");
  }
  return trimmed;
}

async function loadMatchMap(
  db: admin.firestore.Firestore,
  gameId: string,
  matchIds: string[],
  requiredIds: Set<string>
): Promise<Map<string, admin.firestore.DocumentData>> {
  if (matchIds.length === 0) return new Map();
  const refs = matchIds.map((id) => db.doc(`games/${gameId}/matches/${id}`));
  const snaps = await db.getAll(...refs);
  const out = new Map<string, admin.firestore.DocumentData>();
  for (const snap of snaps) {
    if (!snap.exists) {
      if (requiredIds.has(snap.id)) {
        throw new HttpsError("invalid-argument", "Una partita indicata non esiste.");
      }
      continue;
    }
    out.set(snap.id, snap.data() ?? {});
  }
  return out;
}

export const saveSchedule = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const provider = request.auth?.token.firebase?.sign_in_provider;
    if (provider !== "anonymous") {
      throw new HttpsError("permission-denied", "Solo i giocatori possono salvare la schedina.");
    }

    const data = (request.data ?? {}) as {
      gameId?: unknown;
      predictions?: unknown;
      topScorerPick?: unknown;
      winnerPick?: unknown;
      submit?: unknown;
    };
    if (typeof data.gameId !== "string" || !data.gameId.trim()) {
      throw new HttpsError("invalid-argument", "Gioco non valido.");
    }

    const gameId = data.gameId;
    const submit = data.submit === true;
    const predictions = sanitizePredictions(data.predictions);
    const topScorerPick = sanitizePick(data.topScorerPick, submit);
    const winnerPick = sanitizePick(data.winnerPick, submit);
    const now = new Date();
    const db = admin.firestore();

    const gameRef = db.doc(`games/${gameId}`);
    const playerRef = db.doc(`games/${gameId}/players/${uid}`);
    const [gameSnap, playerSnap] = await Promise.all([gameRef.get(), playerRef.get()]);
    if (!gameSnap.exists) {
      throw new HttpsError("not-found", "Gioco non trovato.");
    }
    if (!playerSnap.exists) {
      throw new HttpsError("not-found", "Giocatore non trovato.");
    }

    const gameData = gameSnap.data() ?? {};
    let currentPhase: string;
    try {
      currentPhase = requireCurrentPhase(gameData);
    } catch {
      throw new HttpsError("failed-precondition", "Fase corrente del gioco non configurata.");
    }

    if (Array.isArray(gameData.admins) && gameData.admins.includes(uid)) {
      throw new HttpsError("permission-denied", "Un admin non puo' inviare una schedina.");
    }

    const playerData = playerSnap.data() ?? {};
    const status = playerData.scheduleStatus;
    if (status !== "bozza" && status !== "rifiutata") {
      throw new HttpsError("failed-precondition", "La schedina non e' piu' modificabile.");
    }

    const oldPredictions =
      playerData.predictions && typeof playerData.predictions === "object"
        ? (playerData.predictions as Record<string, string>)
        : {};
    const newIds = Object.keys(predictions);
    const changedNewIds = newIds.filter((id) => oldPredictions[id] !== predictions[id]);
    const unionIds = Array.from(new Set([...Object.keys(oldPredictions), ...newIds]));
    const matchMap = await loadMatchMap(db, gameId, unionIds, new Set(changedNewIds));

    for (const matchId of unionIds) {
      const before = oldPredictions[matchId] ?? null;
      const after = predictions[matchId] ?? null;
      const matchData = matchMap.get(matchId);
      if (matchData && before !== after && isMatchClosed(gameData, matchData, now)) {
        throw new HttpsError(
          "failed-precondition",
          "Alcuni pronostici sono gia' chiusi e non possono essere modificati."
        );
      }
    }

    if (submit) {
      const phaseMatches = await db
        .collection(`games/${gameId}/matches`)
        .where("phase", "==", currentPhase)
        .get();
      if (phaseMatches.empty) {
        throw new HttpsError("failed-precondition", "Nessuna partita disponibile per questa fase.");
      }
      for (const matchDoc of phaseMatches.docs) {
        if (!predictions[matchDoc.id]) {
          throw new HttpsError("failed-precondition", "Schedina incompleta.");
        }
        if (isMatchClosed(gameData, matchDoc.data(), now)) {
          throw new HttpsError("failed-precondition", "La schedina per questa fase e' gia' chiusa.");
        }
      }
    }

    const nextStatus = submit ? "inviata" : status === "rifiutata" ? "rifiutata" : "bozza";
    await db.runTransaction(async (tx) => {
      const freshPlayer = await tx.get(playerRef);
      const freshStatus = freshPlayer.data()?.scheduleStatus;
      if (freshStatus !== "bozza" && freshStatus !== "rifiutata") {
        throw new HttpsError("failed-precondition", "La schedina non e' piu' modificabile.");
      }
      tx.update(playerRef, {
        predictions,
        topScorerPick,
        winnerPick,
        scheduleStatus: nextStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(submit ? { submittedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
      });
    });

    return { ok: true, scheduleStatus: nextStatus };
  }
);
