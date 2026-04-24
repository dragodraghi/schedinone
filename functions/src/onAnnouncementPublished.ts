import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { sendPushToUids } from "./messaging";

export const onAnnouncementPublished = onDocumentWritten(
  { document: "games/{gameId}/announcements/{announcementId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const beforeStatus = before?.status;
    const afterStatus = after.status;
    if (beforeStatus === "published" || afterStatus !== "published") return;
    if (after.deletedAt) return;

    const { gameId } = event.params;
    const db = admin.firestore();

    let uids: string[];
    if (Array.isArray(after.targetUids) && after.targetUids.length > 0) {
      uids = after.targetUids as string[];
    } else {
      const players = await db.collection(`games/${gameId}/players`).get();
      uids = players.docs.map((d) => d.id);
    }

    const title: string = after.title ?? "Annuncio";
    const body: string = ((after.body as string) ?? "").slice(0, 140);

    await sendPushToUids(uids, {
      title,
      body,
      data: { gameId, kind: "announcement", announcementId: event.params.announcementId },
    });
  }
);
