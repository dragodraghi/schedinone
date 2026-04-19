/**
 * FIFA World Cup 2026 — Draw ufficiale del 5 dicembre 2025
 * Sede: USA / Mexico / Canada · 11 giugno – 19 luglio 2026
 * 48 squadre in 12 gironi da 4.
 *
 * Nomi squadre in italiano per corrispondere alla mappa `flags.ts`.
 * Fonte: FIFA / ESPN / DAZN (draw del 5 dicembre 2025 al Kennedy Center, Washington DC).
 * Partita d'apertura: Messico vs Sudafrica, 11 giugno 2026, Estadio Azteca.
 */

export interface WCGroup {
  group: string;
  teams: [string, string, string, string]; // pot 1, 2, 3, 4
}

export interface WCMatch {
  id: string;
  phase: "gironi";
  group: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  result: null;
  score: null;
  locked: false;
}

export const WC2026_GROUPS: WCGroup[] = [
  { group: "A", teams: ["Messico", "Sudafrica", "Corea del Sud", "Repubblica Ceca"] },
  { group: "B", teams: ["Canada", "Bosnia-Erzegovina", "Qatar", "Svizzera"] },
  { group: "C", teams: ["Brasile", "Marocco", "Haiti", "Scozia"] },
  { group: "D", teams: ["USA", "Paraguay", "Australia", "Turchia"] },
  { group: "E", teams: ["Germania", "Curaçao", "Costa d'Avorio", "Ecuador"] },
  { group: "F", teams: ["Olanda", "Giappone", "Svezia", "Tunisia"] },
  { group: "G", teams: ["Belgio", "Egitto", "Iran", "Nuova Zelanda"] },
  { group: "H", teams: ["Spagna", "Capo Verde", "Arabia Saudita", "Uruguay"] },
  { group: "I", teams: ["Francia", "Senegal", "Iraq", "Norvegia"] },
  { group: "J", teams: ["Argentina", "Algeria", "Austria", "Giordania"] },
  { group: "K", teams: ["Portogallo", "RD Congo", "Uzbekistan", "Colombia"] },
  { group: "L", teams: ["Inghilterra", "Croazia", "Ghana", "Panama"] },
];

/**
 * Round-robin pairings per ogni girone (MD = matchday).
 * Con 4 squadre (A, B, C, D) ci sono 6 partite in 3 giornate:
 *   MD1: A-B, C-D
 *   MD2: A-C, D-B
 *   MD3: A-D, B-C
 */
const RR_PAIRS: [number, number][][] = [
  [[0, 1], [2, 3]], // MD1
  [[0, 2], [3, 1]], // MD2
  [[0, 3], [1, 2]], // MD3
];

/**
 * REAL kickoff times from the FIFA World Cup 2026 schedule (published after
 * the Dec 5, 2025 draw). Times are in UTC. Keys use "home|away" but the
 * lookup accepts either direction.
 *
 * Source: fourfourtwo.com / skysports.com (both cross-checked). Converted
 * from UK BST (UTC+1) to UTC.
 */
const REAL_KICKOFFS_UTC: Record<string, string> = {
  // Group A
  "Messico|Sudafrica": "2026-06-11T19:00:00Z",
  "Corea del Sud|Repubblica Ceca": "2026-06-12T02:00:00Z",
  "Messico|Corea del Sud": "2026-06-18T01:00:00Z",
  "Repubblica Ceca|Sudafrica": "2026-06-18T16:00:00Z",
  "Messico|Repubblica Ceca": "2026-06-24T01:00:00Z",
  "Sudafrica|Corea del Sud": "2026-06-24T01:00:00Z",
  // Group B
  "Canada|Bosnia-Erzegovina": "2026-06-12T19:00:00Z",
  "Qatar|Svizzera": "2026-06-13T19:00:00Z",
  "Svizzera|Bosnia-Erzegovina": "2026-06-18T19:00:00Z",
  "Canada|Qatar": "2026-06-18T22:00:00Z",
  "Canada|Svizzera": "2026-06-24T19:00:00Z",
  "Bosnia-Erzegovina|Qatar": "2026-06-24T19:00:00Z",
  // Group C
  "Brasile|Marocco": "2026-06-13T22:00:00Z",
  "Haiti|Scozia": "2026-06-14T01:00:00Z",
  "Scozia|Marocco": "2026-06-19T22:00:00Z",
  "Brasile|Haiti": "2026-06-20T01:00:00Z",
  "Brasile|Scozia": "2026-06-24T22:00:00Z",
  "Marocco|Haiti": "2026-06-24T22:00:00Z",
  // Group D
  "USA|Paraguay": "2026-06-13T01:00:00Z",
  "Australia|Turchia": "2026-06-14T04:00:00Z",
  "USA|Australia": "2026-06-19T19:00:00Z",
  "Turchia|Paraguay": "2026-06-20T04:00:00Z",
  "USA|Turchia": "2026-06-26T02:00:00Z",
  "Paraguay|Australia": "2026-06-26T02:00:00Z",
  // Group E
  "Costa d'Avorio|Ecuador": "2026-06-14T17:00:00Z",
  "Germania|Curaçao": "2026-06-14T23:00:00Z",
  "Germania|Costa d'Avorio": "2026-06-20T20:00:00Z",
  "Ecuador|Curaçao": "2026-06-21T00:00:00Z",
  "Ecuador|Germania": "2026-06-25T20:00:00Z",
  "Curaçao|Costa d'Avorio": "2026-06-25T20:00:00Z",
  // Group F
  "Olanda|Giappone": "2026-06-14T20:00:00Z",
  "Svezia|Tunisia": "2026-06-15T02:00:00Z",
  "Olanda|Svezia": "2026-06-20T17:00:00Z",
  "Tunisia|Giappone": "2026-06-21T04:00:00Z",
  "Olanda|Tunisia": "2026-06-25T23:00:00Z",
  "Giappone|Svezia": "2026-06-25T23:00:00Z",
  // Group G
  "Belgio|Egitto": "2026-06-15T19:00:00Z",
  "Iran|Nuova Zelanda": "2026-06-16T01:00:00Z",
  "Belgio|Iran": "2026-06-21T19:00:00Z",
  "Nuova Zelanda|Egitto": "2026-06-22T01:00:00Z",
  "Belgio|Nuova Zelanda": "2026-06-27T03:00:00Z",
  "Egitto|Iran": "2026-06-27T03:00:00Z",
  // Group H
  "Spagna|Capo Verde": "2026-06-15T16:00:00Z",
  "Arabia Saudita|Uruguay": "2026-06-15T22:00:00Z",
  "Spagna|Arabia Saudita": "2026-06-21T16:00:00Z",
  "Uruguay|Capo Verde": "2026-06-21T22:00:00Z",
  "Uruguay|Spagna": "2026-06-27T00:00:00Z",
  "Capo Verde|Arabia Saudita": "2026-06-27T00:00:00Z",
  // Group I
  "Francia|Senegal": "2026-06-16T19:00:00Z",
  "Iraq|Norvegia": "2026-06-16T22:00:00Z",
  "Francia|Iraq": "2026-06-22T21:00:00Z",
  "Norvegia|Senegal": "2026-06-23T00:00:00Z",
  "Francia|Norvegia": "2026-06-26T19:00:00Z",
  "Senegal|Iraq": "2026-06-26T19:00:00Z",
  // Group J
  "Argentina|Algeria": "2026-06-17T01:00:00Z",
  "Austria|Giordania": "2026-06-17T04:00:00Z",
  "Argentina|Austria": "2026-06-22T17:00:00Z",
  "Giordania|Algeria": "2026-06-23T03:00:00Z",
  "Argentina|Giordania": "2026-06-28T02:00:00Z",
  "Algeria|Austria": "2026-06-28T02:00:00Z",
  // Group K
  "Portogallo|RD Congo": "2026-06-17T17:00:00Z",
  "Uzbekistan|Colombia": "2026-06-18T02:00:00Z",
  "Portogallo|Uzbekistan": "2026-06-23T17:00:00Z",
  "Colombia|RD Congo": "2026-06-24T02:00:00Z",
  "Portogallo|Colombia": "2026-06-27T23:30:00Z",
  "RD Congo|Uzbekistan": "2026-06-27T23:30:00Z",
  // Group L
  "Inghilterra|Croazia": "2026-06-17T20:00:00Z",
  "Ghana|Panama": "2026-06-17T23:00:00Z",
  "Inghilterra|Ghana": "2026-06-23T20:00:00Z",
  "Panama|Croazia": "2026-06-23T23:00:00Z",
  "Inghilterra|Panama": "2026-06-28T21:00:00Z",
  "Croazia|Ghana": "2026-06-28T21:00:00Z",
};

function realKickoff(home: string, away: string): Date | null {
  const direct = REAL_KICKOFFS_UTC[`${home}|${away}`];
  if (direct) return new Date(direct);
  const reversed = REAL_KICKOFFS_UTC[`${away}|${home}`];
  if (reversed) return new Date(reversed);
  return null;
}

/**
 * Fallback synthetic kickoff if a real date is missing. Should never fire
 * for the 72 group-stage matches, but keeps the function total.
 */
function syntheticKickoff(groupIdx: number, md: number, slotIdx: number): Date {
  const mdStartDays: Record<number, number> = { 1: 0, 2: 7, 3: 13 };
  const baseMs = Date.UTC(2026, 5, 11, 18, 0, 0);
  const groupOffsetHours = (groupIdx % 12) * 4;
  const slotOffsetHours = slotIdx * 3;
  const dayOffset = mdStartDays[md];
  return new Date(
    baseMs +
      dayOffset * 24 * 3600 * 1000 +
      groupOffsetHours * 3600 * 1000 +
      slotOffsetHours * 3600 * 1000
  );
}

/**
 * Build all 72 group stage matches with synthesized kickoff times.
 * The Comitato can correct individual dates from the admin panel.
 */
export function buildWC2026Matches(): WCMatch[] {
  const matches: WCMatch[] = [];
  WC2026_GROUPS.forEach((g, gIdx) => {
    RR_PAIRS.forEach((mdPairs, mdIdx) => {
      mdPairs.forEach(([homeIdx, awayIdx], slotIdx) => {
        const home = g.teams[homeIdx];
        const away = g.teams[awayIdx];
        const kickoff = realKickoff(home, away) ?? syntheticKickoff(gIdx, mdIdx + 1, slotIdx);
        matches.push({
          id: `gir-${g.group}-md${mdIdx + 1}-${homeIdx}${awayIdx}`,
          phase: "gironi",
          group: g.group,
          homeTeam: home,
          awayTeam: away,
          kickoff,
          result: null,
          score: null,
          locked: false,
        });
      });
    });
  });
  // Ordina cronologicamente
  matches.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  return matches;
}

/**
 * Returns how many of the 72 match pairings have a real (non-synthetic)
 * kickoff in the lookup table. Used by the admin UI to show coverage.
 */
export function countRealKickoffs(): number {
  let n = 0;
  WC2026_GROUPS.forEach((g) => {
    RR_PAIRS.forEach((mdPairs) => {
      mdPairs.forEach(([homeIdx, awayIdx]) => {
        if (realKickoff(g.teams[homeIdx], g.teams[awayIdx])) n++;
      });
    });
  });
  return n;
}

export const WC2026_TEAMS = WC2026_GROUPS.flatMap((g) => g.teams);
