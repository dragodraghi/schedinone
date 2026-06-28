import type { Match, Phase, QualifierSign } from "./types";

export type QualifierPredictions = Record<string, QualifierSign>;

const phaseOrder: Record<Phase, number> = {
  gironi: 0,
  sedicesimi: 1,
  ottavi: 2,
  quarti: 3,
  semifinali: 4,
  finale: 5,
};

export function selectedTeam(match: Match, sign: QualifierSign): string {
  return sign === "1" ? match.homeTeam : match.awayTeam;
}

export function isPlaceholderTeam(team: string): boolean {
  const normalized = team.trim().toLowerCase();
  return (
    !normalized ||
    normalized.startsWith("vincente ") ||
    normalized.startsWith("winner ") ||
    normalized.startsWith("tbd") ||
    normalized.startsWith("da definire")
  );
}

export function downstreamMatchIds(matches: Match[], matchId: string): Set<string> {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const out = new Set<string>();
  const queue = [matchId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;
    const current = byId.get(currentId);
    if (!current?.feedsInto || out.has(current.feedsInto)) continue;
    out.add(current.feedsInto);
    queue.push(current.feedsInto);
  }

  return out;
}

export function withBracketPick(
  matches: Match[],
  predictions: QualifierPredictions,
  matchId: string,
  sign: QualifierSign | null
): QualifierPredictions {
  const next = { ...predictions };
  for (const id of downstreamMatchIds(matches, matchId)) {
    delete next[id];
  }
  if (sign) next[matchId] = sign;
  else delete next[matchId];
  return next;
}

export function applyBracketPredictions(
  matches: Match[],
  predictions: QualifierPredictions
): Match[] {
  const byId = new Map(matches.map((match) => [match.id, { ...match }]));
  const ordered = [...matches].sort((a, b) => {
    const phaseDiff = phaseOrder[a.phase] - phaseOrder[b.phase];
    return phaseDiff || a.id.localeCompare(b.id);
  });

  for (const source of ordered) {
    const sourceMatch = byId.get(source.id);
    const sign = predictions[source.id];
    if (!sourceMatch || !sign || !sourceMatch.feedsInto || !sourceMatch.feedsIntoSide) continue;

    const target = byId.get(sourceMatch.feedsInto);
    if (!target) continue;

    const winner = selectedTeam(sourceMatch, sign);
    if (sourceMatch.feedsIntoSide === "home") target.homeTeam = winner;
    else target.awayTeam = winner;
  }

  return matches.map((match) => byId.get(match.id) ?? match);
}

export function sortBracketMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const phaseDiff = phaseOrder[a.phase] - phaseOrder[b.phase];
    if (phaseDiff !== 0) return phaseDiff;
    return (a.bracketSlot ?? a.id).localeCompare(b.bracketSlot ?? b.id);
  });
}

export function qualifierPredictionsFromPlayer(
  predictions: Record<string, string>
): QualifierPredictions {
  const out: QualifierPredictions = {};
  for (const [matchId, sign] of Object.entries(predictions)) {
    if (sign === "1" || sign === "2") out[matchId] = sign;
  }
  return out;
}
