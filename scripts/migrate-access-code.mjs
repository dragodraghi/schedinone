// One-shot migration: hash the plaintext games/{id}.accessCode into
// games/{id}/private/config.accessCodeHash, then remove the plaintext field
// from the publicly-readable game doc.
//
// Prerequisites:
//   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to the service account
//   - cd scripts && npm install firebase-admin bcryptjs
//
// Usage:
//   node migrate-access-code.mjs               # dry run, prints what it would do
//   node migrate-access-code.mjs --apply       # actually performs the migration
//
// Idempotent: running --apply twice is safe. The second run sees the field
// already removed and exits with no changes.

import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = "schedinone-2026";
const APPLY = process.argv.includes("--apply");

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

const gameRef = db.doc(`games/${GAME_ID}`);
const privateRef = gameRef.collection("private").doc("config");

const gameSnap = await gameRef.get();
if (!gameSnap.exists) {
  console.error(`ERRORE: gioco ${GAME_ID} non trovato.`);
  process.exit(1);
}
const game = gameSnap.data() ?? {};
const plaintext = game.accessCode;

const privateSnap = await privateRef.get();
const alreadyHashed =
  privateSnap.exists &&
  typeof (privateSnap.data() ?? {}).accessCodeHash === "string" &&
  (privateSnap.data() ?? {}).accessCodeHash.length > 0;

console.log(`Stato attuale:`);
console.log(`  games/${GAME_ID}.accessCode  : ${plaintext ? "presente" : "ASSENTE"}`);
console.log(`  games/${GAME_ID}/private/config.accessCodeHash : ${alreadyHashed ? "presente" : "ASSENTE"}`);

if (!plaintext && alreadyHashed) {
  console.log("\nNiente da fare: migrazione già completata.");
  process.exit(0);
}

if (!plaintext && !alreadyHashed) {
  console.error(
    "\nERRORE: nessun accessCode in chiaro e nessun hash in private/config. Impossibile migrare."
  );
  process.exit(1);
}

if (!APPLY) {
  console.log("\n--- DRY RUN (nessuna modifica) ---");
  if (plaintext && !alreadyHashed) {
    console.log(`  Genererei bcrypt(accessCode) e scriverei in private/config`);
  }
  if (plaintext) {
    console.log(`  Rimuoverei games/${GAME_ID}.accessCode`);
  }
  console.log("\nRilancia con --apply per eseguire davvero.");
  process.exit(0);
}

console.log("\n--- APPLY ---");

if (plaintext && !alreadyHashed) {
  const hash = await bcrypt.hash(plaintext, 10);
  await privateRef.set(
    { accessCodeHash: hash, migratedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  console.log(`  ✓ private/config.accessCodeHash scritto`);
}

if (plaintext) {
  await gameRef.update({ accessCode: admin.firestore.FieldValue.delete() });
  console.log(`  ✓ games/${GAME_ID}.accessCode rimosso`);
}

const verify = await gameRef.get();
const stillThere = (verify.data() ?? {}).accessCode;
if (stillThere) {
  console.error(`  ✗ ERRORE: il campo accessCode è ancora presente!`);
  process.exit(1);
}

console.log("\nMigrazione completata. Il codice gioco non è più nel doc pubblico.");
process.exit(0);
