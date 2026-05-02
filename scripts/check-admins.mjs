import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";
admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const snap = await admin.firestore().doc("games/schedinone-2026").get();
console.log("admins:", snap.data()?.admins);
process.exit(0);
