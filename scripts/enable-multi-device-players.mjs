import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = process.env.GAME_ID || "schedinone-2026";
const APPLY = process.argv.includes("--apply");
const requestedNames = process.argv
  .slice(2)
  .filter((arg) => arg !== "--apply")
  .map((arg) => arg.trim())
  .filter(Boolean);
const TARGET_NAMES = requestedNames.length > 0
  ? requestedNames
  : ["THE FLOWERS", "Sorelle Dessanti", "Italia"];

function normalizeName(name) {
  return String(name).trim().toLowerCase();
}

function nameKey(name) {
  return encodeURIComponent(normalizeName(name));
}

function timestampIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function publicSummary(id, data) {
  return {
    id,
    name: data.name ?? null,
    nameLower: data.nameLower ?? null,
    joinedAt: timestampIso(data.joinedAt),
    scheduleStatus: data.scheduleStatus ?? null,
    predictionsCount: data.predictions && typeof data.predictions === "object"
      ? Object.keys(data.predictions).length
      : 0,
    multiDeviceEnabled: data.multiDeviceEnabled === true,
    deviceUids: Array.isArray(data.deviceUids) ? data.deviceUids : [],
  };
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}

const db = admin.firestore();
const gameRef = db.collection("games").doc(GAME_ID);
const allPlayersSnap = await gameRef.collection("players").get();
const playersById = new Map(allPlayersSnap.docs.map((doc) => [doc.id, doc]));
const results = [];

for (const name of TARGET_NAMES) {
  const normalized = normalizeName(name);
  const nameSnap = await gameRef.collection("playerNames").doc(nameKey(name)).get();
  let playerDoc = null;

  const nameUid = nameSnap.data()?.uid;
  if (typeof nameUid === "string" && playersById.has(nameUid)) {
    playerDoc = playersById.get(nameUid);
  }

  if (!playerDoc) {
    const byLower = allPlayersSnap.docs.find((doc) => normalizeName(doc.data().nameLower ?? "") === normalized);
    playerDoc = byLower ?? null;
  }

  if (!playerDoc) {
    const byComputedName = allPlayersSnap.docs.find((doc) => normalizeName(doc.data().name ?? "") === normalized);
    playerDoc = byComputedName ?? null;
  }

  results.push({
    requestedName: name,
    found: !!playerDoc,
    player: playerDoc ? publicSummary(playerDoc.id, playerDoc.data()) : null,
    ref: playerDoc?.ref ?? null,
  });
}

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  gameId: GAME_ID,
  targets: results.map(({ requestedName, found, player }) => ({ requestedName, found, player })),
}, null, 2));

const missing = results.filter((item) => !item.found);
if (missing.length > 0) {
  console.error(`Mancano ${missing.length} squadre: ${missing.map((item) => item.requestedName).join(", ")}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run soltanto. Usa --apply per abilitare il multi-dispositivo.");
  process.exit(0);
}

const batch = db.batch();
const now = admin.firestore.FieldValue.serverTimestamp();

for (const item of results) {
  const playerId = item.player.id;
  batch.update(item.ref, {
    multiDeviceEnabled: true,
    deviceUids: admin.firestore.FieldValue.arrayUnion(playerId),
    multiDeviceEnabledAt: now,
    updatedAt: now,
  });
}

await batch.commit();
console.log(`Multi-dispositivo abilitato per ${results.length} squadre.`);
