import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

type ChatFrom = "player" | "committee";

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getChatFrom(value: unknown): ChatFrom {
  return value === "committee" ? "committee" : "player";
}

export const deleteChatMessage = onCall(
  { region: "europe-west1", cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

    const gameId = getString(request.data?.gameId);
    const threadUid = getString(request.data?.threadUid);
    const messageId = getString(request.data?.messageId);
    if (!gameId || !threadUid || !messageId) {
      throw new HttpsError("invalid-argument", "gameId/threadUid/messageId mancanti.");
    }

    const db = admin.firestore();
    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");

    const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];
    if (!admins.includes(uid)) {
      throw new HttpsError("permission-denied", "Solo il Comitato puo' cancellare messaggi.");
    }

    const threadRef = db.doc(`games/${gameId}/threads/${threadUid}`);
    const messagesRef = threadRef.collection("messages");
    const messageRef = messagesRef.doc(messageId);

    const result = await db.runTransaction(async (tx) => {
      const messageSnap = await tx.get(messageRef);
      if (!messageSnap.exists) return { deleted: false };

      const recentSnap = await tx.get(messagesRef.orderBy("createdAt", "desc").limit(2));
      const replacement = recentSnap.docs.find((doc) => doc.id !== messageId);

      tx.delete(messageRef);

      if (!replacement) {
        tx.delete(threadRef);
        return { deleted: true };
      }

      const replacementData = replacement.data();
      tx.set(
        threadRef,
        {
          playerUid: threadUid,
          lastMessageAt: replacementData.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
          lastMessagePreview: getString(replacementData.text).slice(0, 80),
          lastMessageFrom: getChatFrom(replacementData.from),
        },
        { merge: true }
      );

      return { deleted: true };
    });

    return { ok: true, ...result };
  }
);
