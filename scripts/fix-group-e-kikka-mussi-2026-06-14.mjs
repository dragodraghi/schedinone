import admin from "firebase-admin";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = process.env.GAME_ID || "schedinone-2026";
const APPLY = process.argv.includes("--apply");
const FIX_SOURCE = "FIFA official verification 2026-06-14: Germany-Curacao match 400021464";
const KIKKA_UID = "fpERcLrlZlbEX3uldMZWzRpQcrz1";

const MATCH_FIXES = [
  {
    id: "gir-E-md1-01",
    expectedHomeTeam: "Germania",
    expectedAwayTeam: "Curaçao",
    update: {
      kickoff: "2026-06-14T17:00:00.000Z",
      kickoffSource: "manual",
      result: "1",
      score: "7-1",
      locked: true,
      resultSource: "manual",
    },
  },
  {
    id: "gir-E-md1-23",
    expectedHomeTeam: "Costa d'Avorio",
    expectedAwayTeam: "Ecuador",
    update: {
      kickoff: "2026-06-14T23:00:00.000Z",
      kickoffSource: "manual",
      result: null,
      score: null,
    },
  },
];

function serialize(value) {
  if (value instanceof admin.firestore.Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

function timestampIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function backupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(homedir(), ".config", "schedinone", "backups");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${GAME_ID}-group-e-kikka-mussi-${stamp}.json`);
}

function summarizeMatch(id, data) {
  return {
    id,
    homeTeam: data.homeTeam ?? null,
    awayTeam: data.awayTeam ?? null,
    kickoff: timestampIso(data.kickoff),
    kickoffSource: data.kickoffSource ?? null,
    result: data.result ?? null,
    score: data.score ?? null,
    locked: data.locked === true,
    resultSource: data.resultSource ?? null,
  };
}

function summarizePlayer(id, data) {
  return {
    id,
    name: data.name ?? null,
    scheduleStatus: data.scheduleStatus ?? null,
    paid: data.paid === true,
    predictionsCount:
      data.predictions && typeof data.predictions === "object" ? Object.keys(data.predictions).length : 0,
    multiDeviceEnabled: data.multiDeviceEnabled === true,
    deviceUids: Array.isArray(data.deviceUids) ? data.deviceUids : [],
  };
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}

const db = admin.firestore();
const gameRef = db.collection("games").doc(GAME_ID);
const gameSnap = await gameRef.get();
if (!gameSnap.exists) {
  throw new Error(`Gioco non trovato: ${GAME_ID}`);
}

const matchPlans = [];
for (const fix of MATCH_FIXES) {
  const ref = gameRef.collection("matches").doc(fix.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Partita mancante: ${fix.id}`);

  const data = snap.data();
  if (data.homeTeam !== fix.expectedHomeTeam || data.awayTeam !== fix.expectedAwayTeam) {
    throw new Error(
      `Partita ${fix.id} non corrisponde: trovato "${data.homeTeam}"-"${data.awayTeam}"`
    );
  }

  matchPlans.push({
    ref,
    id: fix.id,
    rawBefore: data,
    before: summarizeMatch(fix.id, data),
    update: {
      ...fix.update,
      kickoff: admin.firestore.Timestamp.fromDate(new Date(fix.update.kickoff)),
      calendarFixedAt: admin.firestore.FieldValue.serverTimestamp(),
      calendarFixedSource: FIX_SOURCE,
    },
  });
}

const kikkaRef = gameRef.collection("players").doc(KIKKA_UID);
const kikkaSnap = await kikkaRef.get();
if (!kikkaSnap.exists) throw new Error(`Player KIKKA E MUSSI mancante: ${KIKKA_UID}`);

const kikkaData = kikkaSnap.data();
if (kikkaData.name !== "KIKKA E MUSSI") {
  throw new Error(`UID KIKKA non corrisponde: trovato "${kikkaData.name}"`);
}

const playerPlan = {
  ref: kikkaRef,
  id: KIKKA_UID,
  before: summarizePlayer(KIKKA_UID, kikkaData),
  update: {
    multiDeviceEnabled: true,
    deviceUids: admin.firestore.FieldValue.arrayUnion(KIKKA_UID),
    multiDeviceEnabledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
};

const summary = {
  mode: APPLY ? "apply" : "dry-run",
  gameId: GAME_ID,
  docsToUpdate: matchPlans.length + 1,
  matches: matchPlans.map((plan) => ({
    id: plan.id,
    before: plan.before,
    update: {
      ...plan.update,
      kickoff: plan.update.kickoff.toDate().toISOString(),
      calendarFixedAt: "serverTimestamp",
    },
  })),
  player: {
    id: playerPlan.id,
    before: playerPlan.before,
    update: {
      multiDeviceEnabled: true,
      deviceUidsArrayUnion: KIKKA_UID,
      multiDeviceEnabledAt: "serverTimestamp",
      updatedAt: "serverTimestamp",
    },
  },
};

console.log(JSON.stringify(summary, null, 2));

if (!APPLY) {
  console.log("\nDry run soltanto. Usa --apply per scrivere in produzione.");
  process.exit(0);
}

const backup = {
  backedUpAt: new Date().toISOString(),
  game: { id: gameSnap.id, data: serialize(gameSnap.data()) },
  matches: matchPlans.map((plan) => ({
    id: plan.id,
    data: serialize(plan.rawBefore),
  })),
  player: {
    id: playerPlan.id,
    data: serialize(kikkaData),
  },
};

const path = backupPath();
writeFileSync(path, JSON.stringify(backup, null, 2), "utf8");

const batch = db.batch();
for (const plan of matchPlans) {
  batch.update(plan.ref, plan.update);
}
batch.update(playerPlan.ref, playerPlan.update);
await batch.commit();

console.log(`Backup creato: ${path}`);
console.log("Correzione gruppo E e sblocco KIKKA E MUSSI applicati.");
