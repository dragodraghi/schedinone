import * as admin from "firebase-admin";

const db = admin.firestore();

interface ApiFixture {
  fixture: { id: number; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

const teamNameMap: Record<string, string[]> = {
  "USA": ["United States", "USA"],
  "Messico": ["Mexico"],
  "Canada": ["Canada"],
  "Marocco": ["Morocco"],
  "Italia": ["Italy"],
  "Brasile": ["Brazil"],
  "Argentina": ["Argentina"],
  "Germania": ["Germany"],
  "Francia": ["France"],
  "Spagna": ["Spain"],
  "Inghilterra": ["England"],
  "Portogallo": ["Portugal"],
  "Olanda": ["Netherlands", "Holland"],
  "Giappone": ["Japan"],
  "Senegal": ["Senegal"],
  "Ecuador": ["Ecuador"],
  "Belgio": ["Belgium"],
  "Colombia": ["Colombia"],
  "Uruguay": ["Uruguay"],
  "Corea del Sud": ["South Korea", "Korea Republic"],
  "Croazia": ["Croatia"],
  "Danimarca": ["Denmark"],
  "Serbia": ["Serbia"],
  "Australia": ["Australia"],
  "Svizzera": ["Switzerland"],
  "Nigeria": ["Nigeria"],
  "Camerun": ["Cameroon"],
  "Costa Rica": ["Costa Rica"],
  "Polonia": ["Poland"],
  "Egitto": ["Egypt"],
  "Tunisia": ["Tunisia"],
  "Arabia Saudita": ["Saudi Arabia"],
  "Galles": ["Wales"],
  "Iran": ["Iran"],
  "Ghana": ["Ghana"],
  "Panama": ["Panama"],
  "Scozia": ["Scotland"],
  "Perù": ["Peru"],
  "Algeria": ["Algeria"],
  "Honduras": ["Honduras"],
  "Norvegia": ["Norway"],
  "Cile": ["Chile"],
  "Paraguay": ["Paraguay"],
  "Nuova Zelanda": ["New Zealand"],
  "Svezia": ["Sweden"],
  "Turchia": ["Turkey", "Türkiye"],
  "Venezuela": ["Venezuela"],
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

export async function fetchAndUpdateResults(apiKey: string) {
  const today = new Date().toISOString().split("T")[0];

  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${today}&league=1&season=2026`,
    { headers: { "x-apisports-key": apiKey } }
  );

  const data = await response.json();
  const fixtures: ApiFixture[] = data.response ?? [];

  const finishedFixtures = fixtures.filter(
    (f) => f.fixture.status.short === "FT" && f.goals.home !== null && f.goals.away !== null
  );

  if (finishedFixtures.length === 0) return;

  const gamesSnap = await db.collection("games").get();

  for (const gameDoc of gamesSnap.docs) {
    const matchesSnap = await db
      .collection(`games/${gameDoc.id}/matches`)
      .where("result", "==", null)
      .get();

    const batch = db.batch();

    for (const matchDoc of matchesSnap.docs) {
      const matchData = matchDoc.data();
      const apiMatch = finishedFixtures.find(
        (f) =>
          matchesTeam(matchData.homeTeam, f.teams.home.name) &&
          matchesTeam(matchData.awayTeam, f.teams.away.name)
      );

      if (apiMatch && apiMatch.goals.home !== null && apiMatch.goals.away !== null) {
        batch.update(matchDoc.ref, {
          result: scoreToSign(apiMatch.goals.home, apiMatch.goals.away),
          score: `${apiMatch.goals.home}-${apiMatch.goals.away}`,
          locked: true,
          resultSource: "auto",
        });
      }
    }

    await batch.commit();
  }
}
