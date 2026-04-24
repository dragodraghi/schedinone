// Creates/ensures the 3 committee admin accounts and sets them as the ONLY
// admins of the game. Idempotent: if an account already exists, it's reused;
// if it doesn't, it's created. The game's `admins` array is replaced entirely.
//
// Usage:
//   node setup-admins.mjs
//
// Requires scripts/serviceAccount.json (same one used by reset-game.mjs).

import admin from "firebase-admin";
import { readFileSync } from "node:fs";

const GAME_ID = "schedinone-2026";
const PASSWORD = "COMITATO2026";
const ADMINS = [
  { email: "alberto@schedinone.local", displayName: "Alberto" },
  { email: "luca@schedinone.local", displayName: "Luca" },
  { email: "aldo@schedinone.local", displayName: "Aldo" },
];

const sa = JSON.parse(readFileSync("./serviceAccount.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const auth = admin.auth();
const db = admin.firestore();

async function ensureUser({ email, displayName }) {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password: PASSWORD, displayName });
    console.log(`  aggiornato: ${email} (uid=${existing.uid})`);
    return existing.uid;
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const created = await auth.createUser({ email, password: PASSWORD, displayName });
    console.log(`  creato:     ${email} (uid=${created.uid})`);
    return created.uid;
  }
}

(async () => {
  console.log("Setup admin accounts...");
  const uids = [];
  for (const a of ADMINS) uids.push(await ensureUser(a));

  await db.doc(`games/${GAME_ID}`).update({ admins: uids });
  console.log(`\ngame.admins = ${JSON.stringify(uids)}`);
  console.log("\nFatto. Gli unici admin del gioco ora sono Alberto, Luca, Aldo.");
  process.exit(0);
})().catch((err) => {
  console.error("ERRORE:", err);
  process.exit(1);
});
