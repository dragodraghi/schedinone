// Manual seed for Schedinone Golden Plus 2026.
//
// Usage:
//   node scripts/seed-golden-plus-2026.mjs
//   node scripts/seed-golden-plus-2026.mjs --apply
//
// Dry-run is the default and does not require Firestore credentials. --apply
// requires GOOGLE_APPLICATION_CREDENTIALS or the standard local serviceAccount.

import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const CLASSIC_GAME_ID = "schedinone-2026";
const GOLDEN_GAME_ID = "schedinone-golden-plus-2026";
const APPLY = process.argv.includes("--apply");

function pad(value) {
  return String(value).padStart(2, "0");
}

function kickoffFor(phase, index) {
  const base = {
    sedicesimi: Date.UTC(2026, 5, 28, 19, 0, 0),
    ottavi: Date.UTC(2026, 6, 4, 18, 0, 0),
    quarti: Date.UTC(2026, 6, 9, 19, 0, 0),
    semifinali: Date.UTC(2026, 6, 14, 19, 0, 0),
    finale: Date.UTC(2026, 6, 19, 19, 0, 0),
  }[phase];

  const matchesPerDay = phase === "sedicesimi" || phase === "ottavi" ? 3 : 2;
  const dayOffset = Math.floor(index / matchesPerDay);
  const slotOffset = index % matchesPerDay;
  return new Date(base + dayOffset * 24 * 60 * 60 * 1000 + slotOffset * 3 * 60 * 60 * 1000);
}

function matchDoc({ id, phase, homeTeam, awayTeam, feedsInto = null, feedsIntoSide = null, index = 0, kickoff = null }) {
  return {
    id,
    data: {
      phase,
      group: null,
      homeTeam,
      awayTeam,
      kickoff: admin.firestore.Timestamp.fromDate(kickoff ?? kickoffFor(phase, index)),
      kickoffSource: kickoff ? "manual" : "synthetic",
      result: null,
      score: null,
      locked: false,
      bracketSlot: id,
      feedsInto,
      feedsIntoSide,
    },
  };
}

function buildMatches() {
  const matches = [];

  const roundOf32 = [
    {
      id: "r32-01",
      homeTeam: "Sudafrica",
      awayTeam: "Canada",
      kickoff: new Date(Date.UTC(2026, 5, 28, 19, 0, 0)),
      feedsInto: "r16-01",
      feedsIntoSide: "home",
    },
    {
      id: "r32-02",
      homeTeam: "Paesi Bassi",
      awayTeam: "Marocco",
      kickoff: new Date(Date.UTC(2026, 5, 30, 1, 0, 0)),
      feedsInto: "r16-01",
      feedsIntoSide: "away",
    },
    {
      id: "r32-03",
      homeTeam: "Germania",
      awayTeam: "Paraguay",
      kickoff: new Date(Date.UTC(2026, 5, 29, 20, 30, 0)),
      feedsInto: "r16-02",
      feedsIntoSide: "home",
    },
    {
      id: "r32-04",
      homeTeam: "Francia",
      awayTeam: "Svezia",
      kickoff: new Date(Date.UTC(2026, 5, 30, 21, 0, 0)),
      feedsInto: "r16-02",
      feedsIntoSide: "away",
    },
    {
      id: "r32-05",
      homeTeam: "Brasile",
      awayTeam: "Giappone",
      kickoff: new Date(Date.UTC(2026, 5, 29, 17, 0, 0)),
      feedsInto: "r16-03",
      feedsIntoSide: "home",
    },
    {
      id: "r32-06",
      homeTeam: "Costa d'Avorio",
      awayTeam: "Norvegia",
      kickoff: new Date(Date.UTC(2026, 5, 30, 17, 0, 0)),
      feedsInto: "r16-03",
      feedsIntoSide: "away",
    },
    {
      id: "r32-07",
      homeTeam: "Messico",
      awayTeam: "Ecuador",
      kickoff: new Date(Date.UTC(2026, 6, 1, 1, 0, 0)),
      feedsInto: "r16-04",
      feedsIntoSide: "home",
    },
    {
      id: "r32-08",
      homeTeam: "Inghilterra",
      awayTeam: "RD Congo",
      kickoff: new Date(Date.UTC(2026, 6, 1, 16, 0, 0)),
      feedsInto: "r16-04",
      feedsIntoSide: "away",
    },
    {
      id: "r32-09",
      homeTeam: "Portogallo",
      awayTeam: "Croazia",
      kickoff: new Date(Date.UTC(2026, 6, 2, 23, 0, 0)),
      feedsInto: "r16-05",
      feedsIntoSide: "home",
    },
    {
      id: "r32-10",
      homeTeam: "Spagna",
      awayTeam: "Austria",
      kickoff: new Date(Date.UTC(2026, 6, 2, 19, 0, 0)),
      feedsInto: "r16-05",
      feedsIntoSide: "away",
    },
    {
      id: "r32-11",
      homeTeam: "Stati Uniti",
      awayTeam: "Bosnia-Erzegovina",
      kickoff: new Date(Date.UTC(2026, 6, 2, 0, 0, 0)),
      feedsInto: "r16-06",
      feedsIntoSide: "home",
    },
    {
      id: "r32-12",
      homeTeam: "Belgio",
      awayTeam: "Senegal",
      kickoff: new Date(Date.UTC(2026, 6, 1, 20, 0, 0)),
      feedsInto: "r16-06",
      feedsIntoSide: "away",
    },
    {
      id: "r32-13",
      homeTeam: "Argentina",
      awayTeam: "Capo Verde",
      kickoff: new Date(Date.UTC(2026, 6, 3, 22, 0, 0)),
      feedsInto: "r16-07",
      feedsIntoSide: "home",
    },
    {
      id: "r32-14",
      homeTeam: "Australia",
      awayTeam: "Egitto",
      kickoff: new Date(Date.UTC(2026, 6, 3, 18, 0, 0)),
      feedsInto: "r16-07",
      feedsIntoSide: "away",
    },
    {
      id: "r32-15",
      homeTeam: "Svizzera",
      awayTeam: "Algeria",
      kickoff: new Date(Date.UTC(2026, 6, 3, 3, 0, 0)),
      feedsInto: "r16-08",
      feedsIntoSide: "home",
    },
    {
      id: "r32-16",
      homeTeam: "Colombia",
      awayTeam: "Ghana",
      kickoff: new Date(Date.UTC(2026, 6, 4, 1, 30, 0)),
      feedsInto: "r16-08",
      feedsIntoSide: "away",
    },
  ];

  for (const match of roundOf32) {
    matches.push(
      matchDoc({
        ...match,
        phase: "sedicesimi",
      })
    );
  }

  const roundOf16Feeds = [
    ["r16-01", "qf-01", "home"],
    ["r16-02", "qf-01", "away"],
    ["r16-03", "qf-03", "home"],
    ["r16-04", "qf-03", "away"],
    ["r16-05", "qf-02", "home"],
    ["r16-06", "qf-02", "away"],
    ["r16-07", "qf-04", "home"],
    ["r16-08", "qf-04", "away"],
  ];

  for (let i = 1; i <= 8; i++) {
    const [id, feedsInto, feedsIntoSide] = roundOf16Feeds[i - 1];
    const firstSource = i * 2 - 1;
    const secondSource = i * 2;
    matches.push(
      matchDoc({
        id,
        phase: "ottavi",
        homeTeam: `Vincente r32-${pad(firstSource)}`,
        awayTeam: `Vincente r32-${pad(secondSource)}`,
        feedsInto,
        feedsIntoSide,
        index: i - 1,
      })
    );
  }

  for (let i = 1; i <= 4; i++) {
    const id = `qf-${pad(i)}`;
    const firstSource = i * 2 - 1;
    const secondSource = i * 2;
    matches.push(
      matchDoc({
        id,
        phase: "quarti",
        homeTeam: `Vincente r16-${pad(firstSource)}`,
        awayTeam: `Vincente r16-${pad(secondSource)}`,
        feedsInto: `sf-${pad(Math.ceil(i / 2))}`,
        feedsIntoSide: i % 2 === 1 ? "home" : "away",
        index: i - 1,
      })
    );
  }

  for (let i = 1; i <= 2; i++) {
    const id = `sf-${pad(i)}`;
    const firstSource = i * 2 - 1;
    const secondSource = i * 2;
    matches.push(
      matchDoc({
        id,
        phase: "semifinali",
        homeTeam: `Vincente qf-${pad(firstSource)}`,
        awayTeam: `Vincente qf-${pad(secondSource)}`,
        feedsInto: "final",
        feedsIntoSide: i === 1 ? "home" : "away",
        index: i - 1,
      })
    );
  }

  matches.push(
    matchDoc({
      id: "final",
      phase: "finale",
      homeTeam: "Vincente sf-01",
      awayTeam: "Vincente sf-02",
      index: 0,
    })
  );

  return matches;
}

function buildGoldenGame(classicGame = {}) {
  const accessClosesAt = new Date(kickoffFor("sedicesimi", 0).getTime() - 60 * 60 * 1000);
  return {
    name: "Schedinone Golden Plus 2026",
    entryFee: 20,
    admins: Array.isArray(classicGame.admins) ? classicGame.admins : [],
    adminPlayerUids:
      classicGame.adminPlayerUids && typeof classicGame.adminPlayerUids === "object"
        ? classicGame.adminPlayerUids
        : {},
    playerDeviceAliases:
      classicGame.playerDeviceAliases && typeof classicGame.playerDeviceAliases === "object"
        ? classicGame.playerDeviceAliases
        : {},
    accessCode: "",
    lockLeadHours: 1,
    phaseLockLeadHours: {},
    phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
    currentPhase: "sedicesimi",
    topScorer: null,
    winner: null,
    accessClosesAt: admin.firestore.Timestamp.fromDate(accessClosesAt),
    mode: "golden-plus",
    predictionMode: "qualifier",
    specialPicksEnabled: false,
    sourceGameId: CLASSIC_GAME_ID,
  };
}

const plannedMatches = buildMatches();
const plannedAccessClosesAt = new Date(kickoffFor("sedicesimi", 0).getTime() - 60 * 60 * 1000);

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "apply" : "dry-run",
      gameId: GOLDEN_GAME_ID,
      sourceGameId: CLASSIC_GAME_ID,
      matchDocs: plannedMatches.length,
      accessClosesAt: plannedAccessClosesAt.toISOString(),
      phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
      note: APPLY
        ? "Scrittura Firestore richiesta."
        : "Nessuna modifica. Rilancia con --apply per scrivere.",
    },
    null,
    2
  )
);

if (!APPLY) {
  process.exit(0);
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount()),
  projectId: "schedinone-2026",
});

const db = admin.firestore();
const classicRef = db.doc(`games/${CLASSIC_GAME_ID}`);
const goldenRef = db.doc(`games/${GOLDEN_GAME_ID}`);
const [classicSnap, goldenSnap] = await Promise.all([classicRef.get(), goldenRef.get()]);

if (!classicSnap.exists) {
  throw new Error(`Gioco classico non trovato: ${CLASSIC_GAME_ID}`);
}

if (goldenSnap.exists) {
  throw new Error(
    `Il gioco ${GOLDEN_GAME_ID} esiste gia'. Script interrotto per evitare sovrascritture.`
  );
}

const batch = db.batch();
batch.set(goldenRef, {
  ...buildGoldenGame(classicSnap.data() ?? {}),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

for (const match of plannedMatches) {
  batch.set(goldenRef.collection("matches").doc(match.id), {
    ...match.data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

await batch.commit();

console.log(`Seed completato: games/${GOLDEN_GAME_ID} con ${plannedMatches.length} partite.`);
