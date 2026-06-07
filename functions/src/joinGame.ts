import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as bcrypt from "bcryptjs";
import { resolveExtraDeviceLinkTarget } from "./joinGameAccess";

const MAX_NAME_LEN = 30;
const MAX_CODE_LEN = 30;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function nameKey(name: string): string {
  return encodeURIComponent(name);
}

function publicPlayerData(data: admin.firestore.DocumentData) {
  const status =
    data.scheduleStatus === "inviata" ||
    data.scheduleStatus === "accettata" ||
    data.scheduleStatus === "rifiutata"
      ? data.scheduleStatus
      : "bozza";
  const accepted = status === "accettata";
  return {
    name: typeof data.name === "string" ? data.name : "Giocatore",
    joinedAt: data.joinedAt ?? null,
    points: Number.isFinite(Number(data.points)) ? Number(data.points) : 0,
    paid: data.paid === true,
    scheduleStatus: status,
    predictions: accepted && data.predictions && typeof data.predictions === "object"
      ? data.predictions
      : {},
    topScorerPick: accepted && typeof data.topScorerPick === "string" ? data.topScorerPick : "",
    winnerPick: accepted && typeof data.winnerPick === "string" ? data.winnerPick : "",
  };
}

function alreadyRegisteredError(name: string): HttpsError {
  return new HttpsError(
    "already-exists",
    `La squadra "${name}" e' gia' registrata. Usa il dispositivo originale o chiedi al Comitato.`
  );
}

export const joinGame = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const provider = request.auth.token.firebase?.sign_in_provider;
    if (provider !== "anonymous") {
      throw new HttpsError(
        "permission-denied",
        "joinGame e' riservato all'accesso giocatore (anonimo)."
      );
    }

    const { gameId, name, code } = (request.data ?? {}) as {
      gameId?: unknown;
      name?: unknown;
      code?: unknown;
    };

    if (
      typeof gameId !== "string" ||
      typeof name !== "string" ||
      typeof code !== "string" ||
      !gameId.trim() ||
      !name.trim() ||
      !code.trim() ||
      name.length > MAX_NAME_LEN ||
      code.length > MAX_CODE_LEN
    ) {
      throw new HttpsError("invalid-argument", "Parametri mancanti o non validi.");
    }

    const db = admin.firestore();
    const uid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      throw new HttpsError("not-found", "Gioco non trovato.");
    }
    const gameData = gameSnap.data() ?? {};

    if (Array.isArray(gameData.admins) && gameData.admins.includes(uid)) {
      throw new HttpsError(
        "permission-denied",
        "Un account admin non puo' iscriversi come giocatore."
      );
    }

    // Prefer the private hash. The legacy plaintext fallback should be removed
    // after running scripts/migrate-access-code.mjs --apply in production.
    const privateRef = gameRef.collection("private").doc("config");
    const privateSnap = await privateRef.get();
    let codeOk = false;
    if (privateSnap.exists) {
      const hash = (privateSnap.data() ?? {}).accessCodeHash as string | undefined;
      if (typeof hash === "string" && hash.length > 0) {
        codeOk = await bcrypt.compare(code, hash);
      }
    }
    if (!codeOk && typeof gameData.accessCode === "string") {
      codeOk = code === gameData.accessCode;
    }
    if (!codeOk) {
      throw new HttpsError("permission-denied", "Password non valida.");
    }

    const requestedName = name.trim();
    const normalized = normalizeName(requestedName);
    const playerRef = db.doc(`games/${gameId}/players/${uid}`);
    const publicPlayerRef = db.doc(`games/${gameId}/publicPlayers/${uid}`);
    const nameRef = db.doc(`games/${gameId}/playerNames/${nameKey(normalized)}`);

    async function linkExtraDevice(targetUid: string) {
      const targetRef = db.doc(`games/${gameId}/players/${targetUid}`);
      await db.runTransaction(async (tx) => {
        const targetSnap = await tx.get(targetRef);
        if (!targetSnap.exists) {
          throw alreadyRegisteredError(requestedName);
        }
        const linkTarget = resolveExtraDeviceLinkTarget(uid, targetSnap.id, targetSnap.data() ?? {});
        if (!linkTarget) {
          throw alreadyRegisteredError(requestedName);
        }
        tx.update(targetRef, {
          deviceUids: admin.firestore.FieldValue.arrayUnion(uid),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(gameRef, {
          [`playerDeviceAliases.${uid}`]: linkTarget,
        });
      });

      return { ok: true, createdPlayer: false, playerUid: targetUid };
    }

    // Compatibility check for player docs created before playerNames existed.
    const dup = await db
      .collection(`games/${gameId}/players`)
      .where("nameLower", "==", normalized)
      .limit(1)
      .get();
    if (!dup.empty && dup.docs[0].id !== uid) {
      return linkExtraDevice(dup.docs[0].id);
    }
    if (dup.empty) {
      const all = await db.collection(`games/${gameId}/players`).get();
      const clash = all.docs.find(
        (d) => typeof d.data().name === "string" && normalizeName(d.data().name) === normalized
      );
      if (clash && clash.id !== uid) {
        return linkExtraDevice(clash.id);
      }
    }

    let createdPlayer = false;
    await db.runTransaction(async (tx) => {
      const existingSnap = await tx.get(playerRef);
      if (existingSnap.exists) {
        tx.set(publicPlayerRef, publicPlayerData(existingSnap.data() ?? {}), { merge: true });
        return;
      }

      const nameSnap = await tx.get(nameRef);
      if (nameSnap.exists) {
        const ownerUid = nameSnap.data()?.uid;
        if (typeof ownerUid === "string" && ownerUid !== uid) {
          const ownerRef = db.doc(`games/${gameId}/players/${ownerUid}`);
          const ownerSnap = await tx.get(ownerRef);
          const linkTarget = ownerSnap.exists
            ? resolveExtraDeviceLinkTarget(uid, ownerSnap.id, ownerSnap.data() ?? {})
            : null;
          if (linkTarget) {
            tx.update(ownerRef, {
              deviceUids: admin.firestore.FieldValue.arrayUnion(uid),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.update(gameRef, {
              [`playerDeviceAliases.${uid}`]: linkTarget,
            });
            return;
          }
        }
        throw alreadyRegisteredError(requestedName);
      }

      const joinedAt = admin.firestore.FieldValue.serverTimestamp();
      const playerData = {
        name: requestedName,
        nameLower: normalized,
        joinedAt,
        predictions: {},
        topScorerPick: "",
        winnerPick: "",
        points: 0,
        paid: false,
        scheduleStatus: "bozza",
        multiDeviceEnabled: false,
        deviceUids: [uid],
      };

      tx.set(nameRef, {
        uid,
        name: requestedName,
        nameLower: normalized,
        createdAt: joinedAt,
      });
      tx.set(playerRef, playerData);
      tx.set(publicPlayerRef, publicPlayerData(playerData));
      createdPlayer = true;
    });

    return { ok: true, createdPlayer };
  }
);
