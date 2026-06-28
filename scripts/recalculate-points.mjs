// Recalculate points for a game using the same implementation deployed in Cloud Functions.
//
// Usage:
//   node scripts/recalculate-points.mjs schedinone-golden-plus-2026

import { createRequire } from "node:module";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const gameId = process.argv[2]?.trim();
const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

if (!gameId) {
  console.error("Usage: node scripts/recalculate-points.mjs <gameId>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount()),
  projectId: "schedinone-2026",
});

const calcPointsModule = await import("../functions/lib/calcPoints.js");
const recalculatePoints =
  calcPointsModule.recalculatePoints ?? calcPointsModule.default?.recalculatePoints;

if (typeof recalculatePoints !== "function") {
  throw new Error("recalculatePoints non trovato in functions/lib/calcPoints.js. Esegui npm --prefix functions run build.");
}

const report = await recalculatePoints(gameId);
console.log(JSON.stringify({ gameId, ...report }, null, 2));
