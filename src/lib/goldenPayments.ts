import type { GoldenAccess, Player } from "./types";

export function mergeGoldenPlayersWithAccessPayments(
  players: Player[],
  accessItems: GoldenAccess[]
): Player[] {
  const paidByAccessId = new Map(
    accessItems
      .filter((access) => access.status === "approved")
      .map((access) => [access.id, access.paid === true])
  );

  return players.map((player) => {
    const accessPaid = paidByAccessId.get(player.id);
    return accessPaid === undefined ? player : { ...player, paid: accessPaid };
  });
}
