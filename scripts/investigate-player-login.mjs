import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = process.env.GAME_ID || "schedinone-2026";
const NAME = process.argv.slice(2).join(" ").trim() || "Aureliano Buendia";

function normalizeName(name) {
  return String(name).trim().toLowerCase();
}

function nameKey(name) {
  return encodeURIComponent(normalizeName(name));
}

function ts(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function countObjectKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function pickPlayer(id, data) {
  return {
    id,
    name: data.name ?? null,
    nameLower: data.nameLower ?? null,
    joinedAt: ts(data.joinedAt),
    updatedAt: ts(data.updatedAt),
    scheduleStatus: data.scheduleStatus ?? null,
    predictionsCount: countObjectKeys(data.predictions),
    topScorerPick: data.topScorerPick ?? "",
    winnerPick: data.winnerPick ?? "",
    paid: data.paid === true,
    points: data.points ?? 0,
  };
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}

const db = admin.firestore();
const auth = admin.auth();
const gameRef = db.collection("games").doc(GAME_ID);
const normalized = normalizeName(NAME);
const encodedNameKey = nameKey(NAME);

console.log(JSON.stringify({
  mode: "read-only",
  gameId: GAME_ID,
  searchedName: NAME,
  normalized,
  nameKey: encodedNameKey,
}, null, 2));

const [
  gameSnap,
  exactNameSnap,
  playersByNameLower,
  allPlayersSnap,
  publicByNameLower,
] = await Promise.all([
  gameRef.get(),
  gameRef.collection("playerNames").doc(encodedNameKey).get(),
  gameRef.collection("players").where("nameLower", "==", normalized).get(),
  gameRef.collection("players").get(),
  gameRef.collection("publicPlayers").where("nameLower", "==", normalized).get().catch(() => null),
]);

console.log("\nGAME");
console.log(JSON.stringify({
  exists: gameSnap.exists,
  adminsCount: Array.isArray(gameSnap.data()?.admins) ? gameSnap.data().admins.length : 0,
}, null, 2));

console.log("\nPLAYER_NAMES_EXACT");
console.log(JSON.stringify(exactNameSnap.exists ? {
  id: exactNameSnap.id,
  ...exactNameSnap.data(),
  createdAt: ts(exactNameSnap.data()?.createdAt),
} : null, null, 2));

const matchesByNameLower = playersByNameLower.docs.map((doc) => pickPlayer(doc.id, doc.data()));
const matchesByComputedName = allPlayersSnap.docs
  .filter((doc) => normalizeName(doc.data().name ?? "") === normalized)
  .map((doc) => pickPlayer(doc.id, doc.data()));
const fuzzyMatches = allPlayersSnap.docs
  .filter((doc) => normalizeName(doc.data().name ?? "").includes("aureliano") || normalizeName(doc.data().name ?? "").includes("buendia"))
  .map((doc) => pickPlayer(doc.id, doc.data()));

console.log("\nPLAYERS_WHERE_NAMELOWER");
console.log(JSON.stringify(matchesByNameLower, null, 2));

console.log("\nPLAYERS_BY_COMPUTED_NAME");
console.log(JSON.stringify(matchesByComputedName, null, 2));

console.log("\nPLAYERS_FUZZY");
console.log(JSON.stringify(fuzzyMatches, null, 2));

if (publicByNameLower) {
  console.log("\nPUBLIC_PLAYERS_WHERE_NAMELOWER");
  console.log(JSON.stringify(publicByNameLower.docs.map((doc) => pickPlayer(doc.id, doc.data())), null, 2));
}

const candidateUids = new Set([
  exactNameSnap.data()?.uid,
  ...matchesByNameLower.map((p) => p.id),
  ...matchesByComputedName.map((p) => p.id),
  ...fuzzyMatches.map((p) => p.id),
].filter(Boolean));

console.log("\nCANDIDATE_UIDS");
console.log(JSON.stringify([...candidateUids], null, 2));

for (const uid of candidateUids) {
  const [
    playerSnap,
    publicSnap,
    threadSnap,
    messagesSnap,
    tokensSnap,
  ] = await Promise.all([
    gameRef.collection("players").doc(uid).get(),
    gameRef.collection("publicPlayers").doc(uid).get(),
    gameRef.collection("threads").doc(uid).get(),
    gameRef.collection("threads").doc(uid).collection("messages").orderBy("createdAt", "desc").limit(5).get().catch(() => null),
    db.collection("userFcmTokens").doc(uid).collection("tokens").get().catch(() => null),
  ]);

  let authUser = null;
  try {
    const u = await auth.getUser(uid);
    authUser = {
      uid: u.uid,
      disabled: u.disabled,
      providerData: u.providerData.map((p) => p.providerId),
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
      lastRefreshTime: u.metadata.lastRefreshTime,
    };
  } catch (err) {
    authUser = { error: err?.code ?? String(err) };
  }

  console.log(`\nUID_DETAIL ${uid}`);
  console.log(JSON.stringify({
    auth: authUser,
    player: playerSnap.exists ? pickPlayer(playerSnap.id, playerSnap.data()) : null,
    publicPlayer: publicSnap.exists ? pickPlayer(publicSnap.id, publicSnap.data()) : null,
    thread: threadSnap.exists ? {
      id: threadSnap.id,
      playerUid: threadSnap.data().playerUid ?? null,
      playerName: threadSnap.data().playerName ?? null,
      lastMessageAt: ts(threadSnap.data().lastMessageAt),
      lastMessageFrom: threadSnap.data().lastMessageFrom ?? null,
      unreadByCommittee: threadSnap.data().unreadByCommittee ?? null,
      unreadByPlayer: threadSnap.data().unreadByPlayer ?? null,
    } : null,
    recentMessages: messagesSnap ? messagesSnap.docs.map((doc) => ({
      id: doc.id,
      from: doc.data().from ?? null,
      senderUid: doc.data().senderUid ?? null,
      createdAt: ts(doc.data().createdAt),
      textPreview: typeof doc.data().text === "string" ? doc.data().text.slice(0, 80) : "",
    })) : null,
    fcmTokensCount: tokensSnap?.size ?? null,
    fcmTokens: tokensSnap ? tokensSnap.docs.map((doc) => ({
      id: doc.id,
      createdAt: ts(doc.data().createdAt),
      updatedAt: ts(doc.data().updatedAt),
      platform: doc.data().platform ?? null,
    })) : null,
  }, null, 2));
}

console.log("\nSUMMARY");
console.log(JSON.stringify({
  playersTotal: allPlayersSnap.size,
  playerNamesExactExists: exactNameSnap.exists,
  playersByNameLowerCount: matchesByNameLower.length,
  playersByComputedNameCount: matchesByComputedName.length,
  fuzzyCount: fuzzyMatches.length,
}, null, 2));
