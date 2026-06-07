import admin from "firebase-admin";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const gameId = process.env.GAME_ID || "schedinone-2026";
const apply = process.argv.includes("--apply");

const corrections = {
  "gir-A-md2-02": { homeTeam: "Messico", awayTeam: "Corea del Sud", kickoff: "2026-06-19T01:00:00.000Z" },
  "gir-A-md3-03": { homeTeam: "Repubblica Ceca", awayTeam: "Messico", kickoff: "2026-06-25T01:00:00.000Z" },
  "gir-A-md3-12": { homeTeam: "Sudafrica", awayTeam: "Corea del Sud", kickoff: "2026-06-25T01:00:00.000Z" },
  "gir-B-md3-03": { homeTeam: "Svizzera", awayTeam: "Canada" },
  "gir-C-md3-03": { homeTeam: "Scozia", awayTeam: "Brasile" },
  "gir-D-md3-03": { homeTeam: "Turchia", awayTeam: "USA" },
  "gir-E-md3-03": { homeTeam: "Ecuador", awayTeam: "Germania" },
  "gir-F-md3-03": { homeTeam: "Tunisia", awayTeam: "Olanda" },
  "gir-G-md3-03": { homeTeam: "Nuova Zelanda", awayTeam: "Belgio" },
  "gir-H-md3-03": { homeTeam: "Uruguay", awayTeam: "Spagna" },
  "gir-I-md3-03": { homeTeam: "Norvegia", awayTeam: "Francia" },
  "gir-J-md3-03": { homeTeam: "Giordania", awayTeam: "Argentina" },
  "gir-K-md3-03": { homeTeam: "Colombia", awayTeam: "Portogallo" },
  "gir-L-md3-03": { homeTeam: "Panama", awayTeam: "Inghilterra", kickoff: "2026-06-27T21:00:00.000Z" },
  "gir-L-md3-12": { homeTeam: "Croazia", awayTeam: "Ghana", kickoff: "2026-06-27T21:00:00.000Z" },
};

const swapPredictionMatchIds = new Set([
  "gir-A-md3-03",
  "gir-B-md3-03",
  "gir-C-md3-03",
  "gir-D-md3-03",
  "gir-E-md3-03",
  "gir-F-md3-03",
  "gir-G-md3-03",
  "gir-H-md3-03",
  "gir-I-md3-03",
  "gir-J-md3-03",
  "gir-K-md3-03",
  "gir-L-md3-03",
]);

function swapSign(sign) {
  if (sign === "1") return "2";
  if (sign === "2") return "1";
  return sign;
}

function serialize(value) {
  if (value instanceof admin.firestore.Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

function kickoffIso(data) {
  return data.kickoff?.toDate?.().toISOString() ?? null;
}

const serviceAccount = loadServiceAccount();
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "schedinone-2026",
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const gameRef = db.doc(`games/${gameId}`);
const [gameSnap, matchesSnap, playersSnap, publicPlayersSnap] = await Promise.all([
  gameRef.get(),
  db.collection(`games/${gameId}/matches`).get(),
  db.collection(`games/${gameId}/players`).get(),
  db.collection(`games/${gameId}/publicPlayers`).get(),
]);

if (!gameSnap.exists) {
  throw new Error(`Gioco non trovato: ${gameId}`);
}

const matchesById = new Map(matchesSnap.docs.map((doc) => [doc.id, doc]));
const matchUpdates = [];

for (const [matchId, correction] of Object.entries(corrections)) {
  const doc = matchesById.get(matchId);
  if (!doc) throw new Error(`Partita mancante in Firestore: ${matchId}`);
  const data = doc.data();
  if (data.result !== null || data.locked === true) {
    throw new Error(`Partita gia' risultata o locked, abort: ${matchId}`);
  }

  const update = {};
  if (data.homeTeam !== correction.homeTeam) update.homeTeam = correction.homeTeam;
  if (data.awayTeam !== correction.awayTeam) update.awayTeam = correction.awayTeam;
  if (correction.kickoff && kickoffIso(data) !== correction.kickoff) {
    update.kickoff = Timestamp.fromDate(new Date(correction.kickoff));
    update.kickoffSource = "manual";
  }

  if (Object.keys(update).length > 0) {
    matchUpdates.push({ ref: doc.ref, matchId, before: serialize(data), update });
  }
}

const playerUpdates = [];
let swappedSigns = 0;
const predictionSwapIdsToApply = new Set(
  matchUpdates
    .filter(
      (item) =>
        swapPredictionMatchIds.has(item.matchId) &&
        (Object.hasOwn(item.update, "homeTeam") || Object.hasOwn(item.update, "awayTeam"))
    )
    .map((item) => item.matchId)
);

for (const doc of playersSnap.docs) {
  const data = doc.data();
  const predictions = data.predictions && typeof data.predictions === "object" ? data.predictions : {};
  let changed = false;
  const nextPredictions = { ...predictions };

  for (const matchId of predictionSwapIdsToApply) {
    const before = nextPredictions[matchId];
    const after = swapSign(before);
    if (before !== after) {
      nextPredictions[matchId] = after;
      changed = true;
      swappedSigns++;
    }
  }

  if (changed) {
    if (data.scheduleStatus !== "bozza" && data.scheduleStatus !== "rifiutata") {
      throw new Error(`Giocatore non in bozza/rifiutata con pronostici da convertire: ${doc.id}`);
    }
    playerUpdates.push({
      ref: doc.ref,
      playerId: doc.id,
      name: data.name ?? "(senza nome)",
      before: predictions,
      after: nextPredictions,
    });
  }
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      gameId,
      matchesRead: matchesSnap.size,
      playersRead: playersSnap.size,
      matchDocsToUpdate: matchUpdates.length,
      playerDocsToUpdate: playerUpdates.length,
      predictionSignsSwapped: swappedSigns,
      matchIds: matchUpdates.map((item) => item.matchId),
      players: playerUpdates.map((item) => ({ playerId: item.playerId, name: item.name })),
    },
    null,
    2
  )
);

if (!apply) {
  console.log("Dry-run soltanto. Usa --apply per scrivere.");
  process.exit(0);
}

const backupDir = join(homedir(), ".config", "schedinone", "backups");
mkdirSync(backupDir, { recursive: true });
const backupPath = join(
  backupDir,
  `${gameId}-calendar-fix-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

writeFileSync(
  backupPath,
  JSON.stringify(
    {
      backedUpAt: new Date().toISOString(),
      game: { id: gameSnap.id, data: serialize(gameSnap.data()) },
      matches: matchesSnap.docs.map((doc) => ({ id: doc.id, data: serialize(doc.data()) })),
      players: playersSnap.docs.map((doc) => ({ id: doc.id, data: serialize(doc.data()) })),
      publicPlayers: publicPlayersSnap.docs.map((doc) => ({ id: doc.id, data: serialize(doc.data()) })),
    },
    null,
    2
  )
);

const batch = db.batch();
const now = FieldValue.serverTimestamp();

for (const item of matchUpdates) {
  batch.update(item.ref, {
    ...item.update,
    calendarFixedAt: now,
    calendarFixedSource: "FIFA/Sky/FourFourTwo verification 2026-06-02",
  });
}

for (const item of playerUpdates) {
  batch.update(item.ref, {
    predictions: item.after,
    calendarFixAdjustedAt: now,
  });
}

await batch.commit();
console.log(`Backup creato: ${backupPath}`);
console.log("Correzione calendario applicata.");
