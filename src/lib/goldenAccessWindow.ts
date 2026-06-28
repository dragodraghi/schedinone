import type { Game, Match } from "./types";

const MS_PER_HOUR = 60 * 60 * 1000;

export function getGoldenAccessClosesAt(game: Game | null, matches: Match[]): Date | null {
  if (game?.accessClosesAt) return game.accessClosesAt;

  const firstMatch = matches
    .filter((match) => match.kickoff.getTime() > 0)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())[0];
  if (!firstMatch) return null;

  const leadHours =
    game?.phaseLockLeadHours?.[firstMatch.phase] ??
    game?.lockLeadHours ??
    1;
  return new Date(firstMatch.kickoff.getTime() - leadHours * MS_PER_HOUR);
}

export function isGoldenAccessOpen(accessClosesAt: Date | null, now = new Date()): boolean {
  return !accessClosesAt || now.getTime() < accessClosesAt.getTime();
}

export function formatGoldenAccessClosesAt(accessClosesAt: Date | null): string {
  if (!accessClosesAt) return "Da definire";
  return accessClosesAt.toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
