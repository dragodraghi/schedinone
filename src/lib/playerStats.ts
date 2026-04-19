import type { Match, Player } from "./types";

export interface PlayerStats {
  /** Predictions correct so far (excluding matches without a result). */
  correct: number;
  /** Matches that have a result (denominator for accuracy). */
  finished: number;
  /** Percentage 0-100. */
  accuracy: number;
  /** Longest streak of consecutive correct predictions, in kickoff order. */
  longestStreak: number;
  /** Current active streak (consecutive correct from the most recent finished match backward). */
  currentStreak: number;
  /** Best-performing matchday: {date, correct, total}. */
  bestDay: { date: Date; correct: number; total: number } | null;
}

/**
 * Compute stat card data for a player. Streaks are based on the order matches
 * were played (kickoff time ascending).
 */
export function computePlayerStats(player: Player, matches: Match[]): PlayerStats {
  const finishedSorted = matches
    .filter((m) => m.result !== null && m.kickoff)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  let correct = 0;
  let longestStreak = 0;
  let currentRun = 0;
  let lastStreak = 0;

  for (const m of finishedSorted) {
    const pred = player.predictions[m.id];
    if (pred && pred === m.result) {
      correct++;
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }
    lastStreak = currentRun;
  }

  // Best day: group matches by calendar day (UTC) and find the day with
  // the highest correct count (ties: most recent wins)
  const byDay = new Map<string, { date: Date; correct: number; total: number }>();
  for (const m of finishedSorted) {
    const d = m.kickoff;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const entry = byDay.get(key) ?? {
      date: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
      correct: 0,
      total: 0,
    };
    entry.total++;
    const pred = player.predictions[m.id];
    if (pred && pred === m.result) entry.correct++;
    byDay.set(key, entry);
  }

  let bestDay: PlayerStats["bestDay"] = null;
  for (const entry of byDay.values()) {
    if (
      entry.correct > 0 &&
      (!bestDay ||
        entry.correct > bestDay.correct ||
        (entry.correct === bestDay.correct && entry.date > bestDay.date))
    ) {
      bestDay = entry;
    }
  }

  return {
    correct,
    finished: finishedSorted.length,
    accuracy:
      finishedSorted.length > 0 ? Math.round((correct / finishedSorted.length) * 100) : 0,
    longestStreak,
    currentStreak: lastStreak,
    bestDay,
  };
}
