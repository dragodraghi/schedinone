import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { publicCallableOptions } from "./callableOptions";
import { recalculatePoints } from "./calcPoints";

export const recalculatePointsNow = onCall(
  publicCallableOptions,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId.trim() : "";
    if (!gameId) throw new HttpsError("invalid-argument", "gameId mancante.");

    const gameSnap = await admin.firestore().doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");

    const admins = gameSnap.data()?.admins;
    if (!Array.isArray(admins) || !admins.includes(uid)) {
      throw new HttpsError("permission-denied", "Solo il Comitato puo' ricalcolare i punti.");
    }

    return { ok: true, ...(await recalculatePoints(gameId)) };
  }
);
