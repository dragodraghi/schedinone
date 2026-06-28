import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { publicCallableOptions } from "./callableOptions";
import { buildPublicPlayerData, type PublicScheduleStatus } from "./publicPlayerData";

const db = admin.firestore();

function parseStatus(value: unknown): PublicScheduleStatus {
  if (value === "bozza" || value === "inviata" || value === "accettata" || value === "rifiutata") {
    return value;
  }
  throw new HttpsError("invalid-argument", "Stato schedina non valido.");
}

function parsePlayerIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Elenco giocatori mancante.");
  }

  const playerIds = [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  if (playerIds.length === 0) {
    throw new HttpsError("invalid-argument", "Nessun giocatore selezionato.");
  }
  if (playerIds.length > 200) {
    throw new HttpsError("invalid-argument", "Troppi giocatori selezionati in una sola operazione.");
  }
  return playerIds;
}

export const updateScheduleStatuses = onCall(publicCallableOptions, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

  const gameId = typeof request.data?.gameId === "string" ? request.data.gameId.trim() : "";
  if (!gameId) throw new HttpsError("invalid-argument", "gameId mancante.");

  const playerIds = parsePlayerIds(request.data?.playerIds);
  const status = parseStatus(request.data?.status);

  const gameSnap = await db.doc(`games/${gameId}`).get();
  if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");

  const admins = gameSnap.data()?.admins;
  if (!Array.isArray(admins) || !admins.includes(uid)) {
    throw new HttpsError("permission-denied", "Solo il Comitato puo' aggiornare le schedine.");
  }

  const playerRefs = playerIds.map((playerId) => db.doc(`games/${gameId}/players/${playerId}`));
  const playerSnaps = await db.getAll(...playerRefs);
  const now = admin.firestore.FieldValue.serverTimestamp();
  let batch = db.batch();
  let pendingWrites = 0;
  let playersUpdated = 0;

  async function commitPending() {
    if (pendingWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  }

  for (const snap of playerSnaps) {
    if (!snap.exists) continue;
    const playerData = snap.data() ?? {};
    const nextPlayerData = { ...playerData, scheduleStatus: status };
    const statusUpdate: Record<string, unknown> = {
      scheduleStatus: status,
      updatedAt: now,
    };
    if (status === "accettata") statusUpdate.acceptedAt = now;
    if (status === "rifiutata") statusUpdate.rejectedAt = now;

    batch.update(snap.ref, statusUpdate);
    pendingWrites++;

    batch.set(
      db.doc(`games/${gameId}/publicPlayers/${snap.id}`),
      {
        ...buildPublicPlayerData(nextPlayerData),
        updatedAt: now,
      },
      { merge: true }
    );
    pendingWrites++;
    playersUpdated++;

    if (pendingWrites >= 400) {
      await commitPending();
    }
  }

  await commitPending();

  return { ok: true, playersUpdated };
});
