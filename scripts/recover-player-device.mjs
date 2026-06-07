import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import admin from "firebase-admin";
import { loadServiceAccount } from "./_loadServiceAccount.mjs";

const GAME_ID = process.env.GAME_ID || "schedinone-2026";
const mode = process.argv[2] || "";
const APPLY = process.argv.includes("--apply");

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : "";
}

function targetName() {
  const raw = process.argv[3] || "";
  if (!raw || raw.startsWith("--")) return "Aureliano Buendia";
  return raw;
}

function normalizeName(name) {
  return String(name).trim().toLowerCase();
}

function nameKey(name) {
  return encodeURIComponent(normalizeName(name));
}

function timestampIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function serialize(value) {
  if (!value) return value;
  if (typeof value.toDate === "function") {
    return { __type: "timestamp", iso: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serialize(val)]));
  }
  return value;
}

function revive(value) {
  if (!value) return value;
  if (value.__type === "timestamp" && typeof value.iso === "string") {
    return admin.firestore.Timestamp.fromDate(new Date(value.iso));
  }
  if (Array.isArray(value)) return value.map(revive);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, revive(val)]));
  }
  return value;
}

function backupPathFor(name, uid) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = normalizeName(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dir = join(homedir(), ".config", "schedinone", "backups");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${safeName || "player"}-${uid}-recovery-${stamp}.json`);
}

function publicSummary(data) {
  return {
    name: data?.name ?? null,
    nameLower: data?.nameLower ?? null,
    joinedAt: timestampIso(data?.joinedAt),
    updatedAt: timestampIso(data?.updatedAt),
    scheduleStatus: data?.scheduleStatus ?? null,
    predictionsCount: data?.predictions && typeof data.predictions === "object" ? Object.keys(data.predictions).length : 0,
    topScorerPick: data?.topScorerPick ?? "",
    winnerPick: data?.winnerPick ?? "",
    paid: data?.paid === true,
    points: data?.points ?? 0,
  };
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}

const db = admin.firestore();
const auth = admin.auth();
const gameRef = db.collection("games").doc(GAME_ID);

async function buildBackup(name) {
  const normalized = normalizeName(name);
  const nameRef = gameRef.collection("playerNames").doc(nameKey(name));
  const nameSnap = await nameRef.get();
  const byLower = await gameRef.collection("players").where("nameLower", "==", normalized).get();
  const byComputed = byLower.empty
    ? (await gameRef.collection("players").get()).docs.filter((doc) => normalizeName(doc.data().name ?? "") === normalized)
    : byLower.docs;

  const uid = nameSnap.data()?.uid || byComputed[0]?.id || "";
  if (!uid) throw new Error(`Nessun player trovato per "${name}".`);

  const playerRef = gameRef.collection("players").doc(uid);
  const publicRef = gameRef.collection("publicPlayers").doc(uid);
  const threadRef = gameRef.collection("threads").doc(uid);
  const tokensRef = db.collection("users").doc(uid).collection("fcmTokens");

  const [playerSnap, publicSnap, threadSnap, messagesSnap, tokensSnap] = await Promise.all([
    playerRef.get(),
    publicRef.get(),
    threadRef.get(),
    threadRef.collection("messages").orderBy("createdAt", "asc").get().catch(() => null),
    tokensRef.get().catch(() => null),
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

  return {
    createdAt: new Date().toISOString(),
    gameId: GAME_ID,
    requestedName: name,
    normalized,
    uid,
    nameDoc: nameSnap.exists ? { id: nameSnap.id, data: serialize(nameSnap.data()) } : null,
    player: playerSnap.exists ? { id: playerSnap.id, data: serialize(playerSnap.data()) } : null,
    publicPlayer: publicSnap.exists ? { id: publicSnap.id, data: serialize(publicSnap.data()) } : null,
    thread: threadSnap.exists ? { id: threadSnap.id, data: serialize(threadSnap.data()) } : null,
    messages: messagesSnap ? messagesSnap.docs.map((doc) => ({ id: doc.id, data: serialize(doc.data()) })) : [],
    fcmTokens: tokensSnap ? tokensSnap.docs.map((doc) => ({ id: doc.id, data: serialize(doc.data()) })) : [],
    auth: authUser,
  };
}

async function release(name) {
  const backup = await buildBackup(name);
  if (!backup.player) throw new Error(`Player doc mancante per uid ${backup.uid}.`);
  const path = backupPathFor(name, backup.uid);
  writeFileSync(path, JSON.stringify(backup, null, 2), "utf8");

  console.log(JSON.stringify({
    mode: "release",
    apply: APPLY,
    backupPath: path,
    uid: backup.uid,
    player: publicSummary(revive(backup.player.data)),
    nameDocExists: !!backup.nameDoc,
    publicPlayerExists: !!backup.publicPlayer,
    messagesCount: backup.messages.length,
    fcmTokensCount: backup.fcmTokens.length,
  }, null, 2));

  if (!APPLY) {
    console.log("\nDry run. Re-run con --apply per liberare la registrazione.");
    return;
  }

  const batch = db.batch();
  batch.delete(gameRef.collection("players").doc(backup.uid));
  batch.delete(gameRef.collection("publicPlayers").doc(backup.uid));
  batch.delete(gameRef.collection("playerNames").doc(nameKey(name)));
  await batch.commit();
  console.log(`Registrazione liberata per "${name}". Backup: ${path}`);
}

async function restore(name, backupPath) {
  if (!backupPath) throw new Error("Usa --backup <path-al-backup-json>.");
  const backup = JSON.parse(readFileSync(resolve(backupPath), "utf8"));
  const normalized = normalizeName(name || backup.requestedName);
  const current = await gameRef.collection("players").where("nameLower", "==", normalized).get();

  if (current.size !== 1) {
    throw new Error(`Trovati ${current.size} player attuali per "${name}". Serve esattamente 1 dopo il nuovo login.`);
  }

  const target = current.docs[0];
  const oldData = revive(backup.player?.data ?? {});
  const restoreData = {
    name: oldData.name ?? name,
    nameLower: oldData.nameLower ?? normalized,
    joinedAt: oldData.joinedAt ?? admin.firestore.FieldValue.serverTimestamp(),
    predictions: oldData.predictions ?? {},
    topScorerPick: oldData.topScorerPick ?? "",
    winnerPick: oldData.winnerPick ?? "",
    points: Number.isFinite(Number(oldData.points)) ? Number(oldData.points) : 0,
    paid: oldData.paid === true,
    scheduleStatus: oldData.scheduleStatus ?? "bozza",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log(JSON.stringify({
    mode: "restore",
    apply: APPLY,
    backupUid: backup.uid,
    targetUid: target.id,
    targetBefore: publicSummary(target.data()),
    restore: publicSummary(restoreData),
  }, null, 2));

  if (!APPLY) {
    console.log("\nDry run. Re-run con --apply per ripristinare i pronostici sul nuovo UID.");
    return;
  }

  const batch = db.batch();
  batch.set(gameRef.collection("players").doc(target.id), restoreData, { merge: true });
  batch.set(gameRef.collection("playerNames").doc(nameKey(name)), {
    uid: target.id,
    name: restoreData.name,
    nameLower: restoreData.nameLower,
    createdAt: restoreData.joinedAt,
    recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
    recoveredFromUid: backup.uid,
  }, { merge: true });
  await batch.commit();
  console.log(`Pronostici ripristinati su uid ${target.id}.`);
}

if (mode === "release") {
  await release(targetName());
} else if (mode === "restore") {
  await restore(targetName(), argValue("--backup"));
} else {
  console.error(
    "Uso:\n" +
      "  node recover-player-device.mjs release \"Aureliano Buendia\" [--apply]\n" +
      "  node recover-player-device.mjs restore \"Aureliano Buendia\" --backup <file.json> [--apply]"
  );
  process.exit(1);
}
