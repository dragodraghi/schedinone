import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { recalculatePoints } from "./calcPoints";
import { joinGameWithCode, migratePublicAdminCodes } from "./gameAccess";
import { lockUpcomingMatches } from "./lockMatches";
import { savePlayerSchedule } from "./saveSchedule";

admin.initializeApp();

/**
 * When the Comitato enters or corrects a match result, recompute every
 * player's total points.
 */
export const onMatchResultUpdate = onDocumentUpdated(
  { document: "games/{gameId}/matches/{matchId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.result !== after.result) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

/**
 * When the Comitato sets the tournament top scorer or winner, recompute
 * points. (Currently these don't grant points — see calcPoints.ts — but
 * keeping the trigger in case the rules evolve.)
 */
export const onGameUpdate = onDocumentUpdated(
  { document: "games/{gameId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.topScorer !== after.topScorer || before.winner !== after.winner) {
      await recalculatePoints(event.params.gameId);
    }
  }
);

/**
 * Lock match predictions 24h before kickoff. Runs every 15 minutes.
 * Timezone is Europe/Rome so the schedule text is human-readable — the
 * actual lock logic uses UTC timestamps, so timezone doesn't affect correctness.
 */
export const scheduledLockMatches = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Rome", region: "europe-west1" },
  async () => {
    await lockUpcomingMatches();
  }
);

/**
 * Backfill public game docs that still expose `adminCode` in plain text.
 * Stores only a hash and removes the legacy field so admin promotion can be
 * validated server-side without leaking the secret to every player.
 */
export const scheduledMigrateAdminCodes = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Rome", region: "europe-west1" },
  async () => {
    await migratePublicAdminCodes();
  }
);

/**
 * Join the game with a player access code or promote the current anonymous
 * session to admin when the admin code is provided.
 */
export const joinGame = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }

    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId : "";
    const name = typeof request.data?.name === "string" ? request.data.name : "";
    const code = typeof request.data?.code === "string" ? request.data.code : "";

    try {
      return await joinGameWithCode(request.auth.uid, gameId, name, code);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      if (reason === "missing-fields" || reason === "invalid-length") {
        throw new HttpsError("invalid-argument", "Inserisci nome e codice validi.");
      }
      if (reason === "game-not-found") {
        throw new HttpsError("not-found", "Gioco non trovato.");
      }
      if (reason === "invalid-code") {
        throw new HttpsError("permission-denied", "Codice non valido.");
      }
      if (reason === "duplicate-name") {
        throw new HttpsError(
          "failed-precondition",
          `Il nome "${name.trim()}" e' gia' usato. Scegli un nome diverso o chiedi al Comitato di rimuovere quello vecchio.`
        );
      }
      console.error("joinGame error:", err);
      throw new HttpsError("internal", "Errore durante l'accesso.");
    }
  }
);

/**
 * Save or submit the current player's schedina. Validation happens server-side
 * so locked phases and read-only statuses can't be bypassed from a custom
 * client.
 */
export const saveSchedule = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    }

    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId : "";
    const submit = request.data?.submit === true;

    try {
      return await savePlayerSchedule(
        request.auth.uid,
        gameId,
        request.data?.predictions,
        request.data?.topScorerPick,
        request.data?.winnerPick,
        submit
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      if (
        reason === "missing-fields" ||
        reason === "invalid-prediction-key" ||
        reason === "invalid-prediction-sign" ||
        reason === "pick-too-long"
      ) {
        throw new HttpsError("invalid-argument", "Dati schedina non validi.");
      }
      if (reason === "game-not-found" || reason === "player-not-found") {
        throw new HttpsError("not-found", "Giocatore o gioco non trovato.");
      }
      if (reason === "missing-phase") {
        throw new HttpsError("failed-precondition", "Fase corrente non configurata.");
      }
      if (reason === "schedule-readonly") {
        throw new HttpsError("failed-precondition", "La schedina non e' piu' modificabile.");
      }
      if (reason === "phase-closed") {
        throw new HttpsError(
          "failed-precondition",
          "La fase corrente e' gia' chiusa: non puoi piu' salvare o inviare la schedina."
        );
      }
      if (reason === "schedule-incomplete") {
        throw new HttpsError("failed-precondition", "Completa tutta la schedina prima dell'invio.");
      }
      console.error("saveSchedule error:", err);
      throw new HttpsError("internal", "Errore nel salvataggio della schedina.");
    }
  }
);

// NOTE: the API-Football automatic result fetcher has been removed — the
// free plan doesn't include WC 2026 season data, so the function had no
// real effect. The Comitato enters results manually from the admin panel;
// the onMatchResultUpdate trigger above then recalculates points instantly.
