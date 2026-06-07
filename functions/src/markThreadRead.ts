import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { publicCallableOptions } from "./callableOptions";

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0
    )
  );
}

export const markThreadRead = onCall(
  publicCallableOptions,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId : "";
    const threadUid = typeof request.data?.threadUid === "string" ? request.data.threadUid : "";
    if (!gameId || !threadUid) throw new HttpsError("invalid-argument", "gameId/threadUid mancanti.");

    const db = admin.firestore();
    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");
    const gameData = gameSnap.data() ?? {};
    const admins: string[] = (gameData.admins as string[] | undefined) ?? [];
    const effectivePlayerUid = asStringRecord(gameData.playerDeviceAliases)[uid] ?? uid;

    const threadRef = db.doc(`games/${gameId}/threads/${threadUid}`);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return { ok: true };

    if (effectivePlayerUid === threadUid) {
      await threadRef.update({ unreadByPlayer: 0 });
    } else if (admins.includes(uid)) {
      await threadRef.update({ unreadByCommittee: 0 });
    } else {
      throw new HttpsError("permission-denied", "Non autorizzato.");
    }
    return { ok: true };
  }
);
