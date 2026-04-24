import * as admin from "firebase-admin";
import { createHash } from "node:crypto";

const db = admin.firestore();

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function isValidAdminCode(
  gameRef: admin.firestore.DocumentReference,
  gameData: admin.firestore.DocumentData,
  submittedCode: string
): Promise<boolean> {
  const normalized = normalizeText(submittedCode);
  if (!normalized) return false;

  const storedHash = normalizeText(gameData.adminCodeHash);
  if (storedHash && storedHash === hashCode(normalized)) {
    return true;
  }

  const legacyCode = normalizeText(gameData.adminCode);
  if (legacyCode && legacyCode === normalized) {
    await gameRef.update({
      adminCodeHash: hashCode(normalized),
      adminCode: admin.firestore.FieldValue.delete(),
    });
    return true;
  }

  return false;
}

export async function migratePublicAdminCodes() {
  const gamesSnap = await db.collection("games").get();
  let batch = db.batch();
  let pendingWrites = 0;

  for (const gameDoc of gamesSnap.docs) {
    const data = gameDoc.data();
    const legacyCode = normalizeText(data.adminCode);
    const storedHash = normalizeText(data.adminCodeHash);

    if (!legacyCode || storedHash) continue;

    batch.update(gameDoc.ref, {
      adminCodeHash: hashCode(legacyCode),
      adminCode: admin.firestore.FieldValue.delete(),
    });
    pendingWrites++;

    if (pendingWrites >= 400) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }
}

export async function joinGameWithCode(
  uid: string,
  gameId: string,
  playerName: string,
  submittedCode: string
): Promise<{ createdPlayer: boolean; isAdmin: boolean }> {
  const name = normalizeText(playerName);
  const code = normalizeText(submittedCode);

  if (!uid || !gameId || !name || !code) {
    throw new Error("missing-fields");
  }
  if (name.length > 30 || code.length > 60) {
    throw new Error("invalid-length");
  }

  const gameRef = db.doc(`games/${gameId}`);
  const playerRef = db.doc(`games/${gameId}/players/${uid}`);

  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) {
    throw new Error("game-not-found");
  }

  const gameData = gameSnap.data() ?? {};
  const accessCode = normalizeText(gameData.accessCode);
  const adminAllowed = await isValidAdminCode(gameRef, gameData, code);
  const accessAllowed = accessCode !== "" && code === accessCode;

  if (!accessAllowed && !adminAllowed) {
    throw new Error("invalid-code");
  }

  const [existingPlayerSnap, playersSnap] = await Promise.all([
    playerRef.get(),
    db.collection(`games/${gameId}/players`).get(),
  ]);

  if (!existingPlayerSnap.exists) {
    const normalizedName = name.toLowerCase();
    const duplicate = playersSnap.docs.find((doc) => {
      if (doc.id === uid) return false;
      const otherName = normalizeText(doc.data().name).toLowerCase();
      return otherName === normalizedName;
    });

    if (duplicate) {
      throw new Error("duplicate-name");
    }
  }

  const batch = db.batch();
  let createdPlayer = false;

  if (!existingPlayerSnap.exists) {
    batch.set(playerRef, {
      name,
      nameLower: name.toLowerCase(),
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      predictions: {},
      topScorerPick: "",
      winnerPick: "",
      points: 0,
      paid: false,
      scheduleStatus: "bozza",
    });
    createdPlayer = true;
  }

  const admins = Array.isArray(gameData.admins) ? gameData.admins : [];
  const alreadyAdmin = admins.includes(uid);
  if (adminAllowed && !alreadyAdmin) {
    batch.update(gameRef, {
      admins: admin.firestore.FieldValue.arrayUnion(uid),
    });
  }

  if (createdPlayer || (adminAllowed && !alreadyAdmin)) {
    await batch.commit();
  }

  return {
    createdPlayer,
    isAdmin: alreadyAdmin || adminAllowed,
  };
}
