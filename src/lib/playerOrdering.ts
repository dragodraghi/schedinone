import type { Player } from "./types";

export interface RankedPlayer {
  player: Player;
  rank: number;
}

export function sortPlayersForLeaderboard(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const pointsDiff = b.points - a.points;
    if (pointsDiff !== 0) return pointsDiff;

    const joinedDiff = a.joinedAt.getTime() - b.joinedAt.getTime();
    if (joinedDiff !== 0) return joinedDiff;

    const nameDiff = a.name.localeCompare(b.name, "it-IT", { sensitivity: "base" });
    if (nameDiff !== 0) return nameDiff;

    return a.id.localeCompare(b.id, "it-IT", { sensitivity: "base" });
  });
}

export function rankPlayersForLeaderboard(players: Player[]): RankedPlayer[] {
  const sorted = sortPlayersForLeaderboard(players);
  let currentRank = 0;
  let lastPoints: number | null = null;

  return sorted.map((player, index) => {
    if (lastPoints === null || player.points !== lastPoints) {
      currentRank = index + 1;
      lastPoints = player.points;
    }

    return { player, rank: currentRank };
  });
}

export function getTopPlayers(players: Player[]): Player[] {
  const sorted = sortPlayersForLeaderboard(players);
  if (sorted.length === 0) return [];

  const topPoints = sorted[0].points;
  return sorted.filter((player) => player.points === topPoints);
}
