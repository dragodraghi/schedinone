import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const markThreadRead = onCall(
  { region: "europe-west1", cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId : "";
    const threadUid = typeof request.data?.threadUid === "string" ? request.data.threadUid : "";
    if (!gameId || !threadUid) throw new HttpsError("invalid-argument", "gameId/threadUid mancanti.");

    const db = admin.firestore();
    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");
    const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];

    const threadRef = db.doc(`games/${gameId}/threads/${threadUid}`);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return { ok: true };

    if (uid === threadUid) {
      await threadRef.update({ unreadByPlayer: 0 });
    } else if (admins.includes(uid)) {
      await threadRef.update({ unreadByCommittee: 0 });
    } else {
      throw new HttpsError("permission-denied", "Non autorizzato.");
    }
    return { ok: true };
  }
);
