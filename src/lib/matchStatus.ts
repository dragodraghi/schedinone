import type { Match } from "./types";

/**
 * - "finished": has a result
 * - "live": kicked off within the last LIVE_WINDOW_MS and no result yet
 * - "awaitingResult": kickoff passed more than LIVE_WINDOW_MS ago but no result
 *   (the Comitato probably forgot to enter it, OR the match went to ET/penalties)
 * - "upcoming": kickoff is in the future
 */
export type MatchStatus = "upcoming" | "live" | "awaitingResult" | "finished";

// Knockout matches can run 2h + 30min ET + penalties ≈ 3h. Plus broadcast slack.
// Use 3.5h as the LIVE window so the badge doesn't disappear during extra time.
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;

export function getMatchStatus(match: Match, now: Date = new Date()): MatchStatus {
  if (match.result) return "finished";
  if (!match.kickoff) return "upcoming";
  const kickoffMs = match.kickoff.getTime();
  const nowMs = now.getTime();
  if (nowMs < kickoffMs) return "upcoming";
  if (nowMs <= kickoffMs + LIVE_WINDOW_MS) return "live";
  return "awaitingResult";
}

/**
 * Find the next truly upcoming match (no result AND kickoff in the future).
 * Excludes matches that kicked off in the past even if they have no result yet
 * (those are in "awaitingResult" state, not "upcoming").
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
