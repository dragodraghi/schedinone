import * as admin from "firebase-admin";

const db = admin.firestore();

interface ApiFixture {
  fixture: { id: number; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
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
          f.teams.home.name.toLowerCase().includes(matchData.homeTeam.toLowerCase()) ||
          matchData.homeTeam.toLowerCase().includes(f.teams.home.name.toLowerCase())
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
