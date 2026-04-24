// Wipes the game to a blank state: keeps only ONE admin uid (you), deletes
// all players, announcements, threads, fcm tokens, and Firebase Auth users
// except you. Matches (tournament schedule) are preserved.
//
// Usage:
//   1) Download a service account JSON from:
//      https://console.firebase.google.com/project/schedinone-2026/settings/serviceaccounts/adminsdk
//      Save it as scripts/serviceAccount.json (already gitignored).
//   2) cd scripts && npm install firebase-admin
//   3) node reset-game.mjs
//
// Safety: requires typing the literal string RESET when prompted.

import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const GAME_ID = "schedinone-2026";
const KEEP_ADMIN_UID = "S1S1uSM6qddDiqwo5qJydXbWl1w2";
const SERVICE_ACCOUNT_PATH = "./serviceAccount.json";

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db = admin.firestore();
const auth = admin.auth();

async function confirm() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `\nQuesto script cancellera' TUTTO dal gioco ${GAME_ID}, tenendo solo l'admin ${KEEP_ADMIN_UID}.\nVerranno cancellati anche TUTTI gli utenti Firebase Auth tranne quello.\n\nDigita RESET per continuare: `,
      (ans) => {
        rl.close();
        resolve(ans.trim() === "RESET");
      }
    );
  });
}

async function deleteSubcollection(parentPath, sub) {
  const ref = db.collection(`${parentPath}/${sub}`);
  const snap = await ref.get();
  console.log(`  ${sub}: ${snap.size} doc da cancellare`);
  const batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    // Recurse into known nested collections first (threads -> messages).
    if (sub === "threads") {
      const msgs = await doc.ref.collection("messages").get();
      for (const m of msgs.docs) batch.delete(m.ref);
    }
    batch.delete(doc.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
    }
  }
  if (count % 400 !== 0) await batch.commit();
}

async function deletePlayers() {
  const ref = db.collection(`games/${GAME_ID}/players`);
  const snap = await ref.get();
  console.log(`  players: ${snap.size} doc da cancellare`);
  const batch = db.batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
}

async function resetAdmins() {
  await db.doc(`games/${GAME_ID}`).update({ admins: [KEEP_ADMIN_UID] });
  console.log(`  game.admins = [${KEEP_ADMIN_UID}]`);
}

async function deleteAuthUsers() {
  let nextPageToken;
  const toDelete = [];
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    for (const u of page.users) {
      if (u.uid !== KEEP_ADMIN_UID) toDelete.push(u.uid);
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  console.log(`  auth users: ${toDelete.length} da cancellare`);
  for (let i = 0; i < toDelete.length; i += 1000) {
    const chunk = toDelete.slice(i, i + 1000);
    const res = await auth.deleteUsers(chunk);
    console.log(`    chunk ${i / 1000 + 1}: success=${res.successCount} fail=${res.failureCount}`);
  }
}

async function deleteUserFcmTokens() {
  const users = await db.collection("users").get();
  console.log(`  users (fcm): ${users.size} doc totali`);
  for (const u of users.docs) {
    if (u.id === KEEP_ADMIN_UID) continue;
    const tokens = await u.ref.collection("fcmTokens").get();
    const batch = db.batch();
    for (const t of tokens.docs) batch.delete(t.ref);
    batch.delete(u.ref);
    await batch.commit();
  }
}

(async () => {
  if (!(await confirm())) {
    console.log("Annullato.");
    process.exit(0);
  }
  console.log("\nInizio reset...");
  await deleteSubcollection(`games/${GAME_ID}`, "threads");
  await deleteSubcollection(`games/${GAME_ID}`, "announcements");
  await deletePlayers();
  await deleteUserFcmTokens();
  await deleteAuthUsers();
  await resetAdmins();
  console.log("\nReset completato. L'app e' vuota, puoi loggarti come la prima volta.");
  process.exit(0);
})().catch((err) => {
  console.error("ERRORE:", err);
  process.exit(1);
});
