import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { publicCallableOptions } from "./callableOptions";
import {
  buildFifaResultProposal,
  FIFA_CALENDAR_MATCHES_URL,
  isResultProposalAllowedForPredictionMode,
  type FifaCalendarMatch,
  type PredictionMode,
} from "./fifaResults";

const db = admin.firestore();

export interface ResultProposalSyncReport {
  proposalsUpdated: number;
  gamesScanned: number;
  matchesScanned: number;
  fixturesScanned: number;
}

async function fetchFifaMatches(): Promise<FifaCalendarMatch[]> {
  const response = await fetch(FIFA_CALENDAR_MATCHES_URL);

  if (!response.ok) {
    throw new Error(`FIFA calendar error ${response.status}`);
  }

  const payload = (await response.json()) as { Results?: unknown };
  if (Array.isArray(payload.Results)) return payload.Results as FifaCalendarMatch[];
  return [];
}

async function commitPending(batch: FirebaseFirestore.WriteBatch, pendingWrites: number) {
  if (pendingWrites === 0) return;
  await batch.commit();
}

export async function fetchAndStoreResultProposals(options: {
  gameId?: string;
} = {}): Promise<ResultProposalSyncReport> {
  const fifaMatches = await fetchFifaMatches();
  const gameDocs = options.gameId
    ? [await db.doc(`games/${options.gameId}`).get()].filter((docSnap) => docSnap.exists)
    : (await db.collection("games").get()).docs;

  let proposalsUpdated = 0;
  let matchesScanned = 0;

  for (const gameDoc of gameDocs) {
    const gameData = gameDoc.data() ?? {};
    const predictionMode: PredictionMode =
      gameData.predictionMode === "qualifier" ? "qualifier" : "result";
    const matchesSnap = await gameDoc.ref.collection("matches").get();
    let batch = db.batch();
    let pendingWrites = 0;

    for (const matchDoc of matchesSnap.docs) {
      const matchData = matchDoc.data();
      matchesScanned++;

      if (matchData.result !== null && matchData.result !== undefined) continue;
      const proposal = fifaMatches
        .map((fifaMatch) => buildFifaResultProposal(matchDoc.id, matchData, fifaMatch))
        .find((draft) => draft !== null);
      if (!proposal) continue;
      if (!isResultProposalAllowedForPredictionMode(proposal, predictionMode)) continue;

      batch.set(
        gameDoc.ref.collection("resultProposals").doc(matchDoc.id),
        {
          ...proposal,
          status: "pending",
          fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      pendingWrites++;
      proposalsUpdated++;

      if (pendingWrites >= 400) {
        await commitPending(batch, pendingWrites);
        batch = db.batch();
        pendingWrites = 0;
      }
    }

    await commitPending(batch, pendingWrites);
  }

  return {
    proposalsUpdated,
    gamesScanned: gameDocs.length,
    matchesScanned,
    fixturesScanned: fifaMatches.length,
  };
}

export const fetchResultProposalsNow = onCall(
  publicCallableOptions,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId.trim() : "";
    if (!gameId) throw new HttpsError("invalid-argument", "gameId mancante.");

    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");

    const admins = gameSnap.data()?.admins;
    if (!Array.isArray(admins) || !admins.includes(uid)) {
      throw new HttpsError("permission-denied", "Solo il Comitato puo' cercare risultati automatici.");
    }

    const report = await fetchAndStoreResultProposals({ gameId });
    return {
      ok: true,
      configured: true,
      ...report,
      message: report.proposalsUpdated > 0
        ? "Proposte risultati aggiornate."
        : "Nessuna nuova proposta trovata.",
    };
  }
);

export const scheduledFetchResultProposals = onSchedule(
  { schedule: "every 30 minutes", timeZone: "Europe/Rome", region: "europe-west1" },
  async () => {
    const report = await fetchAndStoreResultProposals();
    console.log("Result proposal sync completed", report);
  }
);
