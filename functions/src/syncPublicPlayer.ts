import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

function asScheduleStatus(value: unknown): "bozza" | "inviata" | "accettata" | "rifiutata" {
  if (value === "inviata" || value === "accettata" || value === "rifiutata") return value;
  return "bozza";
}

function nameKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

export const syncPublicPlayer = onDocumentWritten(
  { document: "games/{gameId}/players/{playerId}", region: "europe-west1" },
  async (event) => {
    const { gameId, playerId } = event.params;
    const db = admin.firestore();
    const publicRef = db.doc(`games/${gameId}/publicPlayers/${playerId}`);
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) {
      await publicRef.delete();
      if (typeof before?.nameLower === "string") {
        const nameRef = db.doc(`games/${gameId}/playerNames/${nameKey(before.nameLower)}`);
        const nameSnap = await nameRef.get();
        if (nameSnap.data()?.uid === playerId) {
          await nameRef.delete();
        }
      }
      return;
    }

    const status = asScheduleStatus(after.scheduleStatus);
    const accepted = status === "accettata";
    await publicRef.set({
      name: typeof after.name === "string" ? after.name : "Giocatore",
      joinedAt: after.joinedAt ?? null,
      points: Number.isFinite(Number(after.points)) ? Number(after.points) : 0,
      paid: after.paid === true,
      scheduleStatus: status,
      predictions: accepted && after.predictions && typeof after.predictions === "object"
        ? after.predictions
        : {},
      topScorerPick: accepted && typeof after.topScorerPick === "string" ? after.topScorerPick : "",
      winnerPick: accepted && typeof after.winnerPick === "string" ? after.winnerPick : "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
