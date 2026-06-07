import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const apply = process.argv.includes("--apply");
const feeArg = process.argv.find((arg) => arg.startsWith("--fee="));
const nextFee = feeArg ? Number(feeArg.slice("--fee=".length)) : NaN;

if (!Number.isFinite(nextFee) || nextFee < 0 || !Number.isInteger(nextFee)) {
  console.error("Uso: node set-entry-fee.mjs --fee=<euro interi> [--apply]");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });

const ref = admin.firestore().doc("games/schedinone-2026");
const before = (await ref.get()).data()?.entryFee;

if (!apply) {
  console.log(`DRY RUN: entryFee ${before} -> ${nextFee}. Aggiungi --apply per scrivere.`);
  process.exit(0);
}

await ref.update({ entryFee: nextFee });
const after = (await ref.get()).data()?.entryFee;
console.log(`entryFee: ${before} -> ${after}`);
process.exit(0);
