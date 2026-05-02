import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as bcrypt from "bcryptjs";

const MAX_NAME_LEN = 30;
const MAX_CODE_LEN = 30;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
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
        "joinGame è riservato all'accesso giocatore (anonimo)."
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
        "Un account admin non può iscriversi come giocatore."
      );
    }

    // Verify access code: prefer hashed value in private/config, fall back to
    // legacy plaintext field on the game doc until the migration runs.
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
      throw new HttpsError("permission-denied", "Codice non valido.");
    }

    const playerRef = db.doc(`games/${gameId}/players/${uid}`);
    const existingSnap = await playerRef.get();
    if (existingSnap.exists) {
      // Same anonymous user re-opening the app: let them in without recreating.
      return { ok: true, createdPlayer: false };
    }

    const normalized = normalizeName(name);
    const dup = await db
      .collection(`games/${gameId}/players`)
      .where("nameLower", "==", normalized)
      .limit(1)
      .get();
    if (!dup.empty) {
      throw new HttpsError(
        "already-exists",
        `Il nome "${name}" è già usato. Scegli un nome diverso.`
      );
    }
    // Fallback when older docs don't have nameLower yet.
    if (dup.empty) {
      const all = await db.collection(`games/${gameId}/players`).get();
      const clash = all.docs.find(
        (d) => typeof d.data().name === "string" && normalizeName(d.data().name) === normalized
      );
      if (clash) {
        throw new HttpsError(
          "already-exists",
          `Il nome "${name}" è già usato. Scegli un nome diverso.`
        );
      }
    }

    await playerRef.set({
      name: name.trim(),
      nameLower: normalized,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      predictions: {},
      topScorerPick: "",
      winnerPick: "",
      points: 0,
      paid: false,
      scheduleStatus: "bozza",
    });

    return { ok: true, createdPlayer: true };
  }
);
