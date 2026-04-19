/**
 * Sync match kickoff times (and eventually group assignments) from
 * API-Football's FIFA World Cup 2026 fixtures.
 *
 * Client-side sync — run manually from the admin panel. Safe to call
 * repeatedly: it only updates matches whose `kickoffSource` is NOT "manual",
 * so admin edits are never overwritten.
 *
 * API-Football free tier: 100 requests/day. One full sync = 1 request.
 */

import { collection, getDocs, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { teamAliases } from "./teamAliases";

// FIFA World Cup league ID in API-Football is 1.
const FIFA_WC_LEAGUE_ID = 1;
const SEASON = 2026;
const API_URL = `https://v3.football.api-sports.io/fixtures?league=${FIFA_WC_LEAGUE_ID}&season=${SEASON}`;

interface ApiFixture {
  fixture: {
    id: number;
    date: string; // ISO 8601
    status: { short: string };
  };
  league: {
    round: string; // e.g. "Group Stage - 1"
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: { home: number | null; away: number | null };
}

export interface SyncReport {
  updatedKickoffs: number;
  updatedResults: number;
  skippedManual: number;
  unmatched: number;
  totalFixtures: number;
  errors: string[];
}

/**
 * Check if an API team name matches a Firestore team name, using the alias map.
 */
function teamMatches(firestoreName: string, apiName: string): boolean {
  const aliases = teamAliases[firestoreName] ?? [firestoreName];
  const a = apiName.toLowerCase().trim();
  return aliases.some((alias) => alias.toLowerCase() === a);
}

function scoreToSign(home: number, away: number): "1" | "X" | "2" {
  if (home > away) return "1";
  if (home === away) return "X";
  return "2";
}

/**
 * Main sync entry point.
 * Returns a report describing what changed.
 */
export async function syncFixturesFromApi(
  apiKey: string,
  gameId: string
): Promise<SyncReport> {
  const report: SyncReport = {
    updatedKickoffs: 0,
    updatedResults: 0,
    skippedManual: 0,
    unmatched: 0,
    totalFixtures: 0,
    errors: [],
  };

  // 1. Fetch all WC 2026 fixtures from API-Football
  const res = await fetch(API_URL, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) {
    throw new Error(`API-Football HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const fixtures: ApiFixture[] = data.response ?? [];
  report.totalFixtures = fixtures.length;

  if (fixtures.length === 0) {
    report.errors.push("API-Football ha restituito 0 partite. Controlla la chiave o la disponibilità dei dati.");
    return report;
  }

  // 2. Read current matches from Firestore
  const matchesSnap = await getDocs(collection(db, "games", gameId, "matches"));

  // 3. For each local match, find the corresponding API fixture and update
  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const matchDoc of matchesSnap.docs) {
    const m = matchDoc.data();
    const apiFixture = fixtures.find(
      (f) =>
        teamMatches(m.homeTeam, f.teams.home.name) &&
        teamMatches(m.awayTeam, f.teams.away.name)
    );

    if (!apiFixture) {
      report.unmatched++;
      continue;
    }

    const updates: Record<string, unknown> = {};

    // Update kickoff if it hasn't been manually set
    if (m.kickoffSource !== "manual") {
      const apiDate = new Date(apiFixture.fixture.date);
      const currentDate: Date | null = m.kickoff?.toDate ? m.kickoff.toDate() : null;
      if (!currentDate || currentDate.getTime() !== apiDate.getTime()) {
        updates.kickoff = Timestamp.fromDate(apiDate);
        updates.kickoffSource = "api";
        report.updatedKickoffs++;
      }
    } else {
      report.skippedManual++;
    }

    // Update result if match is finished and we don't have it yet
    if (
      apiFixture.fixture.status.short === "FT" &&
      apiFixture.goals.home !== null &&
      apiFixture.goals.away !== null &&
      m.result === null
    ) {
      updates.result = scoreToSign(apiFixture.goals.home, apiFixture.goals.away);
      updates.score = `${apiFixture.goals.home}-${apiFixture.goals.away}`;
      updates.locked = true;
      updates.resultSource = "auto";
      report.updatedResults++;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(matchDoc.ref, updates);
      pendingWrites++;
      // Firestore batch limit is 500 ops
      if (pendingWrites >= 400) {
        await batch.commit();
        pendingWrites = 0;
      }
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return report;
}
