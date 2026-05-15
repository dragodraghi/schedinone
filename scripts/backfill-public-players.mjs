// Backfills games/{GAME_ID}/publicPlayers and games/{GAME_ID}/playerNames
// from existing games/{GAME_ID}/players docs after deploying syncPublicPlayer.
//
// Usage:
//   node backfill-public-players.mjs

import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = "schedinone-2026";

function asScheduleStatus(value) {
  return ["bozza", "inviata", "accettata", "rifiutata"].includes(value) ? value : "bozza";
}

function nameKey(name) {
  return encodeURIComponent(String(name).trim().toLowerCase());
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

const playersSnap = await db.collection(`games/${GAME_ID}/players`).get();
let batch = db.batch();
let pending = 0;

async function flush() {
  if (pending === 0) return;
  await batch.commit();
  batch = db.batch();
  pending = 0;
}

for (const playerDoc of playersSnap.docs) {
  const data = playerDoc.data();
  const status = asScheduleStatus(data.scheduleStatus);
  const accepted = status === "accettata";
  const name = typeof data.name === "string" ? data.name : "Giocatore";
  const nameLower = typeof data.nameLower === "string" ? data.nameLower : name.trim().toLowerCase();

  batch.set(db.doc(`games/${GAME_ID}/publicPlayers/${playerDoc.id}`), {
    name,
    joinedAt: data.joinedAt ?? null,
    points: Number.isFinite(Number(data.points)) ? Number(data.points) : 0,
    paid: data.paid === true,
    scheduleStatus: status,
    predictions: accepted && data.predictions && typeof data.predictions === "object" ? data.predictions : {},
    topScorerPick: accepted && typeof data.topScorerPick === "string" ? data.topScorerPick : "",
    winnerPick: accepted && typeof data.winnerPick === "string" ? data.winnerPick : "",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`games/${GAME_ID}/playerNames/${nameKey(nameLower)}`), {
    uid: playerDoc.id,
    name,
    nameLower,
    createdAt: data.joinedAt ?? admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  pending += 2;
  if (pending >= 400) await flush();
}

await flush();
console.log(`Backfill completato: ${playersSnap.size} giocatori sincronizzati.`);
process.exit(0);
