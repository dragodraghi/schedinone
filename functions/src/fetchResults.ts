import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { publicCallableOptions } from "./callableOptions";

const db = admin.firestore();
const API_FOOTBALL_FIXTURES_URL = "https://v3.football.api-sports.io/fixtures?league=1&season=2026";
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

type Sign = "1" | "X" | "2";

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
    };
  };
  teams: {
    home: {
      name: string;
    };
    away: {
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface ResultProposalSyncReport {
  proposalsUpdated: number;
  gamesScanned: number;
  matchesScanned: number;
  fixturesScanned: number;
}

const teamAliasMap: Record<string, string[]> = {
  "usa": ["united states", "usa"],
  "messico": ["mexico"],
  "sudafrica": ["south africa"],
  "corea del sud": ["south korea", "korea republic"],
  "repubblica ceca": ["czech republic", "czechia"],
  "bosnia erzegovina": ["bosnia and herzegovina", "bosnia & herzegovina", "bosnia"],
  "svizzera": ["switzerland"],
  "brasile": ["brazil"],
  "marocco": ["morocco"],
  "scozia": ["scotland"],
  "turchia": ["turkey", "turkiye"],
  "germania": ["germany"],
  "curacao": ["curacao"],
  "costa d avorio": ["ivory coast", "cote d ivoire", "cote divoire"],
  "olanda": ["netherlands", "holland"],
  "giappone": ["japan"],
  "svezia": ["sweden"],
  "belgio": ["belgium"],
  "egitto": ["egypt"],
  "iran": ["iran", "ir iran"],
  "nuova zelanda": ["new zealand"],
  "spagna": ["spain"],
  "capo verde": ["cape verde", "cabo verde"],
  "arabia saudita": ["saudi arabia"],
  "uruguay": ["uruguay"],
  "francia": ["france"],
  "norvegia": ["norway"],
  "argentina": ["argentina"],
  "algeria": ["algeria"],
  "giordania": ["jordan"],
  "portogallo": ["portugal"],
  "uzbekistan": ["uzbekistan"],
  "inghilterra": ["england"],
  "croazia": ["croatia"],
  "rd congo": ["dr congo", "democratic republic of congo", "congo dr"],
};

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function matchesTeam(firestoreName: string, apiName: string): boolean {
  const normalizedFirestore = normalizeTeamName(firestoreName);
  const normalizedApi = normalizeTeamName(apiName);
  const aliases = teamAliasMap[normalizedFirestore] ?? [];
  return normalizedApi === normalizedFirestore || aliases.map(normalizeTeamName).includes(normalizedApi);
}

function scoreToSign(homeGoals: number, awayGoals: number): Sign {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

function getApiKey(): string {
  return (process.env.API_FOOTBALL_KEY || process.env.APISPORTS_KEY || "").trim();
}

function isFinishedFixture(fixture: ApiFixture): fixture is ApiFixture & {
  goals: { home: number; away: number };
} {
  return (
    FINISHED_STATUSES.has(fixture.fixture.status.short) &&
    typeof fixture.goals.home === "number" &&
    typeof fixture.goals.away === "number"
  );
}

async function fetchFixtures(apiKey: string): Promise<ApiFixture[]> {
  const response = await fetch(API_FOOTBALL_FIXTURES_URL, {
    headers: { "x-apisports-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`API-Football error ${response.status}`);
  }

  const payload = (await response.json()) as { response?: unknown };
  return Array.isArray(payload.response) ? (payload.response as ApiFixture[]) : [];
}

async function commitPending(batch: FirebaseFirestore.WriteBatch, pendingWrites: number) {
  if (pendingWrites === 0) return;
  await batch.commit();
}

export async function fetchAndStoreResultProposals(options: {
  apiKey: string;
  gameId?: string;
}): Promise<ResultProposalSyncReport> {
  const fixtures = await fetchFixtures(options.apiKey);
  const gameDocs = options.gameId
    ? [await db.doc(`games/${options.gameId}`).get()].filter((docSnap) => docSnap.exists)
    : (await db.collection("games").get()).docs;

  let proposalsUpdated = 0;
  let matchesScanned = 0;

  for (const gameDoc of gameDocs) {
    const matchesSnap = await gameDoc.ref.collection("matches").get();
    let batch = db.batch();
    let pendingWrites = 0;

    for (const matchDoc of matchesSnap.docs) {
      const matchData = matchDoc.data();
      matchesScanned++;

      if (matchData.result !== null && matchData.result !== undefined) continue;
      if (typeof matchData.homeTeam !== "string" || typeof matchData.awayTeam !== "string") continue;

      const apiMatch = fixtures.find(
        (fixture) =>
          matchesTeam(matchData.homeTeam, fixture.teams.home.name) &&
          matchesTeam(matchData.awayTeam, fixture.teams.away.name)
      );
      if (!apiMatch || !isFinishedFixture(apiMatch)) continue;

      const score = `${apiMatch.goals.home}-${apiMatch.goals.away}`;
      const result = scoreToSign(apiMatch.goals.home, apiMatch.goals.away);
      batch.set(
        gameDoc.ref.collection("resultProposals").doc(matchDoc.id),
        {
          matchId: matchDoc.id,
          homeTeam: matchData.homeTeam,
          awayTeam: matchData.awayTeam,
          score,
          result,
          fixtureId: apiMatch.fixture.id,
          apiStatus: apiMatch.fixture.status.short,
          source: "api-football",
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
    fixturesScanned: fixtures.length,
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

    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        ok: false,
        configured: false,
        proposalsUpdated: 0,
        gamesScanned: 0,
        matchesScanned: 0,
        fixturesScanned: 0,
        message: "Chiave API risultati non configurata.",
      };
    }

    const report = await fetchAndStoreResultProposals({ apiKey, gameId });
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
    const apiKey = getApiKey();
    if (!apiKey) {
      console.log("API_FOOTBALL_KEY/APISPORTS_KEY missing: skipping result proposal sync.");
      return;
    }

    const report = await fetchAndStoreResultProposals({ apiKey });
    console.log("Result proposal sync completed", report);
  }
);
