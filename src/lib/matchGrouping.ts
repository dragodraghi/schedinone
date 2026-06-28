import type { Match } from "./types";

const ITALY_TIME_ZONE = "Europe/Rome";

export interface MatchDayGroup {
  key: string;
  label: string;
  matches: Match[];
}

export function getOrderedMatchGroups(matches: Match[]): [string, Match[]][] {
  const groups = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = match.group ?? match.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "it-IT", { numeric: true }));
}

export function sortMatchesChronologically(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const kickoffDiff = a.kickoff.getTime() - b.kickoff.getTime();
    if (Number.isFinite(kickoffDiff) && kickoffDiff !== 0) return kickoffDiff;
    return a.id.localeCompare(b.id, "it-IT", { numeric: true });
  });
}

function italianDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: ITALY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function italianDayLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("it-IT", {
    timeZone: ITALY_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getChronologicalMatchDayGroups(matches: Match[]): MatchDayGroup[] {
  const groups: MatchDayGroup[] = [];

  for (const match of sortMatchesChronologically(matches)) {
    const key = italianDayKey(match.kickoff);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.matches.push(match);
    } else {
      groups.push({
        key,
        label: italianDayLabel(match.kickoff),
        matches: [match],
      });
    }
  }

  return groups;
}
