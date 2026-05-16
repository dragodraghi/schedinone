import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = process.env.GAME_ID || "schedinone-2026";
const APPLY = process.argv.includes("--apply");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });
}

const db = admin.firestore();
const gameRef = db.collection("games").doc(GAME_ID);

const playerNamesSnap = await gameRef.collection("playerNames").get();
const stale = [];

for (const nameDoc of playerNamesSnap.docs) {
  const data = nameDoc.data();
  const uid = typeof data.uid === "string" ? data.uid : "";
  const playerSnap = uid ? await gameRef.collection("players").doc(uid).get() : null;
  if (!uid || !playerSnap?.exists) {
    stale.push({
      id: nameDoc.id,
      uid,
      name: typeof data.name === "string" ? data.name : "",
      ref: nameDoc.ref,
    });
  }
}

if (stale.length === 0) {
  console.log(`No stale playerNames found for game ${GAME_ID}.`);
  process.exit(0);
}

console.log(`Found ${stale.length} stale playerNames for game ${GAME_ID}:`);
for (const item of stale) {
  console.log(`- ${item.id} uid=${item.uid || "(missing)"} name="${item.name}"`);
}

if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply to delete them.");
  process.exit(0);
}

const batch = db.batch();
stale.forEach((item) => batch.delete(item.ref));
await batch.commit();

console.log(`Deleted ${stale.length} stale playerNames.`);
