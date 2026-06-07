import type { Match } from "./types";

export function getOrderedMatchGroups(matches: Match[]): [string, Match[]][] {
  const groups = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.group ?? match.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "it-IT", { numeric: true }));
}
