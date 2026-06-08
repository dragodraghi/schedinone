// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-schedinone-rules";
const GAME_ID = "game-1";

let testEnv: RulesTestEnvironment;
const rulesEmulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;
const describeRules = rulesEmulatorAvailable ? describe : describe.skip;

function anonymous(uid: string) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: "anonymous" },
  }).firestore();
}

function signedIn(uid: string) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: "password" },
  }).firestore();
}

function playerData(name: string) {
  return {
    name,
    nameLower: name.toLowerCase(),
    joinedAt: firebase.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
    predictions: { m1: "1" },
    topScorerPick: "Rossi",
    winnerPick: "Italia",
    points: 0,
    paid: false,
    scheduleStatus: "bozza",
  };
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`games/${GAME_ID}`).set({
      name: "Schedinone Test",
      admins: ["admin-1"],
      playerDeviceAliases: {
        "player-1-device-2": "player-1",
      },
      entryFee: 10,
      currentPhase: "gironi",
      phases: ["gironi"],
    });
    await db.doc(`games/${GAME_ID}/matches/m1`).set({
      phase: "gironi",
      group: "A",
      homeTeam: "Italia",
      awayTeam: "Francia",
      kickoff: firebase.firestore.Timestamp.fromDate(new Date("2026-06-11T19:00:00Z")),
      result: null,
      score: null,
      locked: false,
    });
    await db.doc(`games/${GAME_ID}/resultProposals/m1`).set({
      matchId: "m1",
      homeTeam: "Italia",
      awayTeam: "Francia",
      score: "2-0",
      result: "1",
      source: "api-football",
      status: "pending",
      fetchedAt: firebase.firestore.Timestamp.fromDate(new Date("2026-06-11T21:00:00Z")),
    });
    await db.doc(`games/${GAME_ID}/players/player-1`).set({
      ...playerData("Alice"),
      multiDeviceEnabled: true,
      deviceUids: ["player-1", "player-1-device-2"],
    });
    await db.doc(`games/${GAME_ID}/players/player-2`).set(playerData("Bob"));
    await db.doc(`games/${GAME_ID}/publicPlayers/player-2`).set({
      name: "Bob",
      joinedAt: firebase.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
      points: 3,
      paid: true,
      scheduleStatus: "accettata",
      predictions: { m1: "X" },
      topScorerPick: "Bianchi",
      winnerPick: "Brasile",
    });
    await db.doc(`games/${GAME_ID}/threads/player-1`).set({
      playerUid: "player-1",
      playerName: "Alice",
      lastMessageAt: firebase.firestore.Timestamp.fromDate(new Date("2026-06-02T10:00:00Z")),
      lastMessagePreview: "ciao",
      lastMessageFrom: "player",
      unreadByPlayer: 0,
      unreadByCommittee: 1,
    });
    await db.doc(`games/${GAME_ID}/threads/player-1/messages/msg-1`).set({
      text: "ciao",
      from: "player",
      senderUid: "player-1",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2026-06-02T10:00:00Z")),
    });
  });
}

beforeAll(async () => {
  if (!rulesEmulatorAvailable) return;
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  if (!rulesEmulatorAvailable) return;
  await testEnv.clearFirestore();
  await seedData();
});

afterAll(async () => {
  if (!testEnv) return;
  await testEnv.cleanup();
});

describeRules("Firestore rules", () => {
  it("denies direct player creation even for anonymous users", async () => {
    const db = anonymous("player-3");
    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-3`).set({
        name: "Charlie",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        predictions: {},
        topScorerPick: "",
        winnerPick: "",
        points: 0,
        paid: false,
        scheduleStatus: "bozza",
      })
    );
  });

  it("allows a player to read only their private player document", async () => {
    const db = anonymous("player-1");
    await assertSucceeds(db.doc(`games/${GAME_ID}/players/player-1`).get());
    await assertFails(db.doc(`games/${GAME_ID}/players/player-2`).get());
  });

  it("allows an authorized extra player device to use the private player document", async () => {
    const db = anonymous("player-1-device-2");
    await assertSucceeds(db.doc(`games/${GAME_ID}/players/player-1`).get());
    await assertFails(db.doc(`games/${GAME_ID}/players/player-2`).get());
    await assertSucceeds(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        lastAnnouncementReadAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
  });

  it("allows signed-in users to read public player documents but not write them", async () => {
    const db = anonymous("player-1");
    await assertSucceeds(db.doc(`games/${GAME_ID}/publicPlayers/player-2`).get());
    await assertFails(
      db.doc(`games/${GAME_ID}/publicPlayers/player-2`).update({
        points: 99,
      })
    );
  });

  it("denies direct schedina writes but allows the player's read marker", async () => {
    const db = anonymous("player-1");
    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        predictions: { m1: "2" },
      })
    );
    await assertSucceeds(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        lastAnnouncementReadAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
  });

  it("allows game admins to manage player documents", async () => {
    const db = signedIn("admin-1");
    await assertSucceeds(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        paid: true,
      })
    );
  });

  it("denies game admins from directly changing scoring fields", async () => {
    const db = signedIn("admin-1");

    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        points: 99,
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        predictions: { m1: "2" },
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        topScorerPick: "Modificato",
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}/players/player-1`).update({
        winnerPick: "Modificata",
      })
    );
  });

  it("allows game admins to change only safe game settings from the client", async () => {
    const db = signedIn("admin-1");

    await assertSucceeds(
      db.doc(`games/${GAME_ID}`).update({
        currentPhase: "ottavi",
      })
    );
    await assertSucceeds(
      db.doc(`games/${GAME_ID}`).update({
        topScorer: "Rossi",
        winner: "Italia",
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}`).update({
        accessCode: "NUOVO-CODICE",
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}`).update({
        admins: ["admin-1", "player-1"],
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}`).update({
        playerDeviceAliases: {},
      })
    );
  });

  it("validates admin match updates", async () => {
    const db = signedIn("admin-1");

    await assertSucceeds(
      db.doc(`games/${GAME_ID}/matches/m1`).update({
        result: "1",
        score: "2-0",
        resultSource: "manual",
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}/matches/m1`).update({
        result: "3",
      })
    );
    await assertFails(
      db.doc(`games/${GAME_ID}/matches/m1`).update({
        unexpected: true,
      })
    );
  });

  it("keeps automatic result proposals committee-only and read-delete-only", async () => {
    const adminDb = signedIn("admin-1");
    const playerDb = anonymous("player-1");

    await assertSucceeds(adminDb.doc(`games/${GAME_ID}/resultProposals/m1`).get());
    await assertFails(playerDb.doc(`games/${GAME_ID}/resultProposals/m1`).get());
    await assertFails(
      adminDb.doc(`games/${GAME_ID}/resultProposals/m2`).set({
        matchId: "m2",
        homeTeam: "Italia",
        awayTeam: "Francia",
        score: "1-1",
        result: "X",
        source: "browser",
        status: "pending",
        fetchedAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
    await assertFails(
      adminDb.doc(`games/${GAME_ID}/resultProposals/m1`).update({
        status: "ignored",
      })
    );
    await assertSucceeds(adminDb.doc(`games/${GAME_ID}/resultProposals/m1`).delete());
  });

  it("requires chat messages to use server timestamps and allowed keys", async () => {
    const db = anonymous("player-1");
    await assertFails(
      db.collection(`games/${GAME_ID}/threads/player-1/messages`).add({
        text: "ciao",
        from: "player",
        senderUid: "player-1",
        createdAt: firebase.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
      })
    );
    await assertSucceeds(
      db.collection(`games/${GAME_ID}/threads/player-1/messages`).add({
        text: "ciao",
        from: "player",
        senderUid: "player-1",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
  });

  it("allows an authorized extra player device to use the same chat thread", async () => {
    const db = anonymous("player-1-device-2");
    await assertSucceeds(db.doc(`games/${GAME_ID}/threads/player-1`).get());
    await assertSucceeds(db.doc(`games/${GAME_ID}/threads/player-1/messages/msg-1`).get());
    await assertFails(
      db.collection(`games/${GAME_ID}/threads/player-1/messages`).add({
        text: "ciao dal secondo dispositivo",
        from: "player",
        senderUid: "player-1",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
    await assertSucceeds(
      db.collection(`games/${GAME_ID}/threads/player-1/messages`).add({
        text: "ciao dal secondo dispositivo",
        from: "player",
        senderUid: "player-1-device-2",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
    );
  });

  it("denies direct message deletion even to game admins", async () => {
    const playerDb = anonymous("player-1");
    const adminDb = signedIn("admin-1");

    await assertFails(playerDb.doc(`games/${GAME_ID}/threads/player-1/messages/msg-1`).delete());
    await assertFails(adminDb.doc(`games/${GAME_ID}/threads/player-1/messages/msg-1`).delete());
  });
});
