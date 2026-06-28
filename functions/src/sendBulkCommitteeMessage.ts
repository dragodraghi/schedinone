import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { publicCallableOptions } from "./callableOptions";

const CHAT_MESSAGE_MAX = 1000;

export type BulkCommitteeMessageRequest = {
  gameId: string;
  text: string;
};

export function normalizeBulkCommitteeMessageRequest(value: unknown): BulkCommitteeMessageRequest | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const gameId = typeof raw.gameId === "string" ? raw.gameId.trim() : "";
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!gameId || !text || text.length > CHAT_MESSAGE_MAX) return null;
  return { gameId, text };
}

export const sendBulkCommitteeMessage = onCall(
  publicCallableOptions,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

    const normalized = normalizeBulkCommitteeMessageRequest(request.data);
    if (!normalized) {
      throw new HttpsError("invalid-argument", "Messaggio massivo non valido.");
    }

    const { gameId, text } = normalized;
    const db = admin.firestore();
    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");

    const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];
    if (!admins.includes(uid)) {
      throw new HttpsError("permission-denied", "Solo il Comitato puo' inviare messaggi massivi.");
    }

    const playersSnap = await db.collection(`games/${gameId}/players`).get();
    let batch = db.batch();
    let pendingWrites = 0;
    let sent = 0;

    async function commitPending() {
      if (pendingWrites === 0) return;
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }

    for (const playerDoc of playersSnap.docs) {
      const messageRef = db.collection(`games/${gameId}/threads/${playerDoc.id}/messages`).doc();
      batch.set(messageRef, {
        text,
        from: "committee",
        senderUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      pendingWrites++;
      sent++;
      if (pendingWrites >= 450) {
        await commitPending();
      }
    }

    await commitPending();

    return { ok: true, sent };
  }
);
