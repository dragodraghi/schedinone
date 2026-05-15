import type { Game, Match } from "./types";

export const DEFAULT_LOCK_LEAD_HOURS = 24;

export function getLockLeadHours(game: Game, phase: string): number {
  const phaseHours = (game.phaseLockLeadHours as Record<string, number | undefined> | undefined)?.[phase];
  if (typeof phaseHours === "number" && Number.isFinite(phaseHours) && phaseHours >= 0) {
    return phaseHours;
  }
  if (typeof game.lockLeadHours === "number" && Number.isFinite(game.lockLeadHours) && game.lockLeadHours >= 0) {
    return game.lockLeadHours;
  }
  return DEFAULT_LOCK_LEAD_HOURS;
}

export function getCloseAt(game: Game, match: Match): Date {
  return new Date(match.kickoff.getTime() - getLockLeadHours(game, match.phase) * 60 * 60 * 1000);
}

export function isMatchClosedForPredictions(game: Game, match: Match, now = new Date()): boolean {
  return match.locked || getCloseAt(game, match).getTime() <= now.getTime();
}

export function formatLockLead(game: Game, phase: string): string {
  const hours = getLockLeadHours(game, phase);
  if (hours === 24) return "1 giorno prima";
  if (hours % 24 === 0) return `${hours / 24} giorni prima`;
  if (hours === 1) return "1 ora prima";
  return `${hours} ore prima`;
}
