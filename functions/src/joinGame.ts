import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  canonicalPlayerNameKey,
  isReservedPlayerName,
  resolveJoinIdentity,
  resolveExtraDeviceLinkTarget,
} from "./joinGameAccess";
import { verifyAccessCode } from "./joinGameAccessCode";

const MAX_NAME_LEN = 30;
const MAX_CODE_LEN = 30;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
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
      !gameId.trim() ||
      (name !== undefined && typeof name !== "string") ||
      (code !== undefined && typeof code !== "string") ||
      (typeof name === "string" && name.length > MAX_NAME_LEN) ||
      (typeof code === "string" && code.length > MAX_CODE_LEN)
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

    const gameMode = gameData.mode === "golden-plus" ? "golden-plus" : "classic";
    const accessData =
      gameMode === "golden-plus"
        ? (await db.doc(`games/${gameId}/access/${uid}`).get()).data()
        : undefined;
    let joinIdentity: { effectiveName: string; skipCodeCheck: boolean };
    try {
      joinIdentity = resolveJoinIdentity({
        gameMode,
        name,
        code,
        accessData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parametri mancanti o non validi.";
      if (message.includes("Golden Plus")) {
        throw new HttpsError(
          message.includes("incompleto") ? "failed-precondition" : "permission-denied",
          message
        );
      }
      throw new HttpsError("invalid-argument", message);
    }

    if (!joinIdentity.skipCodeCheck) {
      // Use only the private hash; the legacy plaintext game accessCode is no longer accepted.
      const privateRef = gameRef.collection("private").doc("config");
      const privateSnap = await privateRef.get();
      const hash = privateSnap.exists
        ? ((privateSnap.data() ?? {}).accessCodeHash as string | undefined)
        : undefined;
      const codeOk = await verifyAccessCode(code as string, hash, gameData.accessCode);
      if (!codeOk) {
        throw new HttpsError("permission-denied", "Password non valida.");
      }
    }

    const requestedName = joinIdentity.effectiveName;
    if (isReservedPlayerName(requestedName)) {
      throw new HttpsError(
        "invalid-argument",
        "Questo nome non puo' essere usato come squadra. Usa il nome squadra corretto."
      );
    }

    const normalized = normalizeName(requestedName);
    const canonicalName = canonicalPlayerNameKey(requestedName);
    if (!canonicalName) {
      throw new HttpsError("invalid-argument", "Nome squadra non valido.");
    }
    const playerRef = db.doc(`games/${gameId}/players/${uid}`);
    const publicPlayerRef = db.doc(`games/${gameId}/publicPlayers/${uid}`);
    const nameRef = db.doc(`games/${gameId}/playerNames/${canonicalName}`);

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
        (d) =>
          typeof d.data().name === "string" &&
          canonicalPlayerNameKey(d.data().name) === canonicalName
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
        canonicalName,
        createdAt: joinedAt,
      });
      tx.set(playerRef, playerData);
      tx.set(publicPlayerRef, publicPlayerData(playerData));
      createdPlayer = true;
    });

    return { ok: true, createdPlayer };
  }
);
