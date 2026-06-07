import type { Player } from "./types";

export interface WorldCupSeedSafety {
  atRiskPlayers: number;
  blocked: boolean;
}

export function getWorldCupSeedSafety(players: Player[]): WorldCupSeedSafety {
  const atRiskPlayers = players.filter(
    (player) =>
      player.scheduleStatus === "inviata" ||
      player.scheduleStatus === "accettata" ||
      Object.keys(player.predictions ?? {}).length > 0
  ).length;

  return {
    atRiskPlayers,
    blocked: atRiskPlayers > 0,
  };
}
