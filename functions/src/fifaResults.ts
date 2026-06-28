export const FIFA_WORLD_CUP_2026_SEASON_ID = "285023";
export const FIFA_CALENDAR_MATCHES_URL =
  `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${FIFA_WORLD_CUP_2026_SEASON_ID}`;

export type Sign = "1" | "X" | "2";

export interface FifaCalendarMatch {
  IdMatch: string;
  MatchStatus: number;
  Home?: {
    TeamName?: Array<{ Locale?: string; Description?: string }>;
    ShortClubName?: string;
    Abbreviation?: string;
    Score?: number | null;
  };
  Away?: {
    TeamName?: Array<{ Locale?: string; Description?: string }>;
    ShortClubName?: string;
    Abbreviation?: string;
    Score?: number | null;
  };
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
}

export interface ResultProposalDraft {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  result: Sign;
  fixtureId: string;
  apiStatus: string;
  source: "fifa-official";
}

const FINISHED_MATCH_STATUSES = new Set([0]);

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

export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

export function matchesTeam(firestoreName: string, fifaName: string): boolean {
  const normalizedFirestore = normalizeTeamName(firestoreName);
  const normalizedFifa = normalizeTeamName(fifaName);
  const aliases = teamAliasMap[normalizedFirestore] ?? [];
  return normalizedFifa === normalizedFirestore || aliases.map(normalizeTeamName).includes(normalizedFifa);
}

export function scoreToSign(homeGoals: number, awayGoals: number): Sign {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

export function fifaTeamName(team: FifaCalendarMatch["Home"]): string {
  const localized = team?.TeamName?.find((name) => name.Locale === "en-GB") ?? team?.TeamName?.[0];
  return localized?.Description || team?.ShortClubName || team?.Abbreviation || "";
}

export function isFinishedFifaMatch(match: FifaCalendarMatch): match is FifaCalendarMatch & {
  HomeTeamScore: number;
  AwayTeamScore: number;
} {
  return (
    FINISHED_MATCH_STATUSES.has(match.MatchStatus) &&
    typeof match.HomeTeamScore === "number" &&
    typeof match.AwayTeamScore === "number"
  );
}

export function buildFifaResultProposal(
  matchId: string,
  matchData: { homeTeam?: unknown; awayTeam?: unknown },
  fifaMatch: FifaCalendarMatch
): ResultProposalDraft | null {
  if (!isFinishedFifaMatch(fifaMatch)) return null;
  if (typeof matchData.homeTeam !== "string" || typeof matchData.awayTeam !== "string") return null;

  const fifaHome = fifaTeamName(fifaMatch.Home);
  const fifaAway = fifaTeamName(fifaMatch.Away);
  if (!matchesTeam(matchData.homeTeam, fifaHome) || !matchesTeam(matchData.awayTeam, fifaAway)) return null;

  return {
    matchId,
    homeTeam: matchData.homeTeam,
    awayTeam: matchData.awayTeam,
    score: `${fifaMatch.HomeTeamScore}-${fifaMatch.AwayTeamScore}`,
    result: scoreToSign(fifaMatch.HomeTeamScore, fifaMatch.AwayTeamScore),
    fixtureId: fifaMatch.IdMatch,
    apiStatus: String(fifaMatch.MatchStatus),
    source: "fifa-official",
  };
}
