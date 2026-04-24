import admin from "firebase-admin";
import { readFileSync } from "node:fs";
const sa = JSON.parse(readFileSync("./serviceAccount.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const snap = await admin.firestore().doc("games/schedinone-2026").get();
console.log("admins:", snap.data()?.admins);
process.exit(0);
