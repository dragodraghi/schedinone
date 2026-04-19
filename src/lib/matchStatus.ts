import type { Match } from "./types";

/**
 * A match is "live" if it kicked off within the last ~2h and still has no result.
 * Matches with a result are "finished". Otherwise "upcoming".
 */
export type MatchStatus = "upcoming" | "live" | "finished";

const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours from kickoff

export function getMatchStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.result) return "finished";
  if (!match.kickoff) return "upcoming";
  const kickoffMs = match.kickoff.getTime();
  const nowMs = now.getTime();
  if (nowMs >= kickoffMs && nowMs <= kickoffMs + LIVE_WINDOW_MS) {
    return "live";
  }
  return "upcoming";
}

/**
 * Find the next upcoming match (no result, kickoff in the future).
 * Returns null if none.
 */
export function getNextMatch(matches: Match[], now: Date = new Date()): Match | null {
  const nowMs = now.getTime();
  const upcoming = matches
    .filter((m) => !m.result && m.kickoff && m.kickoff.getTime() > nowMs)
    .sort((a, b) => (a.kickoff?.getTime() ?? 0) - (b.kickoff?.getTime() ?? 0));
  return upcoming[0] ?? null;
}

/**
 * Format a duration (in ms) as a human-readable countdown:
 *   "2g 4h" / "3h 12m" / "45m" / "—"
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
