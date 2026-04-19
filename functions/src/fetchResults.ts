import * as admin from "firebase-admin";

const db = admin.firestore();

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

// Maps Firestore (Italian) team names to possible API-Football English variants.
// When the API returns a name not in this map, fallback is a case-insensitive
// equality check — but most confederation/host countries differ in English,
// so keep this map complete especially for the 48 teams actually in WC 2026.
const teamNameMap: Record<string, string[]> = {
  // Hosts + Nord America
  "USA": ["United States", "USA"],
  "Messico": ["Mexico"],
  "Canada": ["Canada"],
  // Sud America
  "Brasile": ["Brazil"],
  "Argentina": ["Argentina"],
  "Colombia": ["Colombia"],
  "Uruguay": ["Uruguay"],
  "Paraguay": ["Paraguay"],
  "Ecuador": ["Ecuador"],
  "Cile": ["Chile"],
  "Perù": ["Peru"],
  "Venezuela": ["Venezuela"],
  // Europa
  "Italia": ["Italy"],
  "Germania": ["Germany"],
  "Francia": ["France"],
  "Spagna": ["Spain"],
  "Inghilterra": ["England"],
  "Portogallo": ["Portugal"],
  "Olanda": ["Netherlands", "Holland"],
  "Belgio": ["Belgium"],
  "Croazia": ["Croatia"],
  "Danimarca": ["Denmark"],
  "Serbia": ["Serbia"],
  "Svizzera": ["Switzerland"],
  "Polonia": ["Poland"],
  "Norvegia": ["Norway"],
  "Svezia": ["Sweden"],
  "Scozia": ["Scotland"],
  "Galles": ["Wales"],
  "Austria": ["Austria"],
  "Repubblica Ceca": ["Czech Republic", "Czechia"],
  "Bosnia-Erzegovina": ["Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia"],
  "Turchia": ["Turkey", "Türkiye"],
  // Asia
  "Giappone": ["Japan"],
  "Corea del Sud": ["South Korea", "Korea Republic"],
  "Australia": ["Australia"],
  "Iran": ["Iran", "IR Iran"],
  "Arabia Saudita": ["Saudi Arabia"],
  "Qatar": ["Qatar"],
  "Iraq": ["Iraq"],
  "Giordania": ["Jordan"],
  "Uzbekistan": ["Uzbekistan"],
  // Africa
  "Marocco": ["Morocco"],
  "Senegal": ["Senegal"],
  "Egitto": ["Egypt"],
  "Tunisia": ["Tunisia"],
  "Algeria": ["Algeria"],
  "Ghana": ["Ghana"],
  "Sudafrica": ["South Africa"],
  "Costa d'Avorio": ["Ivory Coast", "Cote D'Ivoire", "Côte d'Ivoire"],
  "Capo Verde": ["Cape Verde", "Cabo Verde"],
  "RD Congo": ["DR Congo", "Democratic Republic of Congo", "Congo DR"],
  "Nigeria": ["Nigeria"],
  "Camerun": ["Cameroon"],
  // Oceania
  "Nuova Zelanda": ["New Zealand"],
  // Centro America / Caraibi
  "Panama": ["Panama"],
  "Haiti": ["Haiti"],
  "Curaçao": ["Curacao", "Curaçao"],
  "Costa Rica": ["Costa Rica"],
  "Honduras": ["Honduras"],
  "Israele": ["Israel"],
};

function matchesTeam(firestoreName: string, apiName: string): boolean {
  const aliases = teamNameMap[firestoreName];
  if (!aliases) return firestoreName.toLowerCase() === apiName.toLowerCase();
  return aliases.some(a => a.toLowerCase() === apiName.toLowerCase());
}

function scoreToSign(homeGoals: number, awayGoals: number): "1" | "X" | "2" {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

/**
 * Fetch the FULL FIFA WC 2026 fixture list (one API call for the whole season).
 * Updates both:
 *   - kickoff dates (if Firestore match has kickoffSource !== "manual")
 *   - results (if finished and we don't have a result yet)
 */
export async function fetchAndUpdateResults(apiKey: string) {
  // Single API call for the whole tournament — cheap (1/100 daily quota).
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026`,
    { headers: { "x-apisports-key": apiKey } }
  );
  if (!res.ok) return;
  const data = await res.json();
  const allFixtures: ApiFixture[] = data.response ?? [];
  if (allFixtures.length === 0) return;

  const gamesSnap = await db.collection("games").get();

  for (const gameDoc of gamesSnap.docs) {
    const matchesSnap = await db
      .collection(`games/${gameDoc.id}/matches`)
      .get();

    const batch = db.batch();

    for (const matchDoc of matchesSnap.docs) {
      const matchData = matchDoc.data();
      const apiMatch = allFixtures.find(
        (f) =>
          matchesTeam(matchData.homeTeam, f.teams.home.name) &&
          matchesTeam(matchData.awayTeam, f.teams.away.name)
      );

      if (!apiMatch) continue;

      const updates: Record<string, unknown> = {};

      // 1. Kickoff sync — only if not manually set by admin
      if (matchData.kickoffSource !== "manual" && apiMatch.fixture.date) {
        const apiKickoff = new Date(apiMatch.fixture.date);
        const currentKickoff = matchData.kickoff?.toDate
          ? matchData.kickoff.toDate()
          : null;
        if (!currentKickoff || currentKickoff.getTime() !== apiKickoff.getTime()) {
          updates.kickoff = admin.firestore.Timestamp.fromDate(apiKickoff);
          updates.kickoffSource = "api";
        }
      }

      // 2. Result sync — only if match finished and we don't have a result yet
      if (
        matchData.result === null &&
        apiMatch.fixture.status.short === "FT" &&
        apiMatch.goals.home !== null &&
        apiMatch.goals.away !== null
      ) {
        updates.result = scoreToSign(apiMatch.goals.home, apiMatch.goals.away);
        updates.score = `${apiMatch.goals.home}-${apiMatch.goals.away}`;
        updates.locked = true;
        updates.resultSource = "auto";
      }

      if (Object.keys(updates).length > 0) {
        batch.update(matchDoc.ref, updates);
      }
    }

    await batch.commit();
  }
}
