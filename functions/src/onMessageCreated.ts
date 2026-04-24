import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendPushToUids } from "./messaging";

export const onMessageCreated = onDocumentCreated(
  { document: "games/{gameId}/threads/{playerUid}/messages/{messageId}", region: "europe-west1" },
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;
    const { gameId, playerUid } = event.params;
    const db = admin.firestore();
    const threadRef = db.doc(`games/${gameId}/threads/${playerUid}`);
    const threadSnap = await threadRef.get();

    const text: string = msg.text;
    const from: "player" | "committee" = msg.from;
    const preview = text.slice(0, 80);

    const playerSnap = await db.doc(`games/${gameId}/players/${playerUid}`).get();
    const playerName: string = (playerSnap.data()?.name as string | undefined) ?? "Giocatore";

    if (!threadSnap.exists) {
      await threadRef.set({
        playerUid,
        playerName,
        lastMessageAt: msg.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
        lastMessageFrom: from,
        unreadByPlayer: from === "committee" ? 1 : 0,
        unreadByCommittee: from === "player" ? 1 : 0,
      });
    } else {
      const update: Record<string, unknown> = {
        lastMessageAt: msg.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
        lastMessageFrom: from,
      };
      if (from === "player") update.playerName = playerName;
      if (from === "committee") update.unreadByPlayer = admin.firestore.FieldValue.increment(1);
      else update.unreadByCommittee = admin.firestore.FieldValue.increment(1);
      await threadRef.update(update);
    }

    if (from === "committee") {
      await sendPushToUids([playerUid], {
        title: "Nuovo messaggio dal Comitato",
        body: preview,
        data: { gameId, kind: "chat", threadUid: playerUid },
      });
    } else {
      const gameSnap = await db.doc(`games/${gameId}`).get();
      const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];
      await sendPushToUids(admins, {
        title: `Messaggio da ${playerName}`,
        body: preview,
        data: { gameId, kind: "chat", threadUid: playerUid },
      });
    }
  }
);
