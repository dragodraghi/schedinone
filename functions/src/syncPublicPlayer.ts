import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

function asScheduleStatus(value: unknown): "bozza" | "inviata" | "accettata" | "rifiutata" {
  if (value === "inviata" || value === "accettata" || value === "rifiutata") return value;
  return "bozza";
}

function nameKey(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

function normalizedPlayerName(data: admin.firestore.DocumentData | undefined): string | null {
  if (typeof data?.nameLower === "string" && data.nameLower.trim()) {
    return data.nameLower.trim().toLowerCase();
  }
  if (typeof data?.name === "string" && data.name.trim()) {
    return data.name.trim().toLowerCase();
  }
  return null;
}

async function deleteOwnedNameReservations(
  db: admin.firestore.Firestore,
  gameId: string,
  playerId: string,
  previousName: string | null
) {
  const refs = new Map<string, admin.firestore.DocumentReference>();

  if (previousName) {
    const nameRef = db.doc(`games/${gameId}/playerNames/${nameKey(previousName)}`);
    const nameSnap = await nameRef.get();
    if (nameSnap.data()?.uid === playerId) refs.set(nameRef.path, nameRef);
  }

  const ownedNames = await db
    .collection(`games/${gameId}/playerNames`)
    .where("uid", "==", playerId)
    .get();
  ownedNames.docs.forEach((doc) => refs.set(doc.ref.path, doc.ref));

  await Promise.all([...refs.values()].map((ref) => ref.delete()));
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
      await deleteOwnedNameReservations(db, gameId, playerId, normalizedPlayerName(before));
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
