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
 * Distribuzione approssimativa delle giornate sul calendario reale (locked at 20:00 CET/21:00 CEST estivo — use UTC).
 * MD1: 11-17 giugno 2026
 * MD2: 18-23 giugno 2026
 * MD3: 24-27 giugno 2026
 * Due slot per giornata-girone: pomeriggio (18:00 CEST = 16:00 UTC) e sera (21:00 CEST = 19:00 UTC).
 */
function matchdayDate(groupIdx: number, md: number, slotIdx: number): Date {
  // MD1 base: 11 June 2026. Each group plays ~0.5 day apart, wrapping over 6-7 days.
  const mdStartDays: Record<number, number> = { 1: 0, 2: 7, 3: 13 }; // offset dall'11 giugno
  const baseMs = Date.UTC(2026, 5, 11, 18, 0, 0); // 11 June 2026 18:00 UTC (20:00 CEST)
  const groupOffsetHours = (groupIdx % 12) * 4; // 12 gironi × 4h = 48h = 2 giorni di copertura per ogni MD
  const slotOffsetHours = slotIdx * 3; // due slot per gruppo-MD (0h e 3h)
  const dayOffset = mdStartDays[md];
  return new Date(baseMs + dayOffset * 24 * 3600 * 1000 + groupOffsetHours * 3600 * 1000 + slotOffsetHours * 3600 * 1000);
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
        matches.push({
          id: `gir-${g.group}-md${mdIdx + 1}-${homeIdx}${awayIdx}`,
          phase: "gironi",
          group: g.group,
          homeTeam: home,
          awayTeam: away,
          kickoff: matchdayDate(gIdx, mdIdx + 1, slotIdx),
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

export const WC2026_TEAMS = WC2026_GROUPS.flatMap((g) => g.teams);
