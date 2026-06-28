import type { GoldenAccess, Player } from "./types";

export function mergeGoldenPlayersWithAccessPayments(
  players: Player[],
  accessItems: GoldenAccess[]
): Player[] {
  const paidByAccessId = new Map<string, boolean>();
  for (const access of accessItems) {
    if (access.status !== "approved") continue;
    const paid = access.paid === true;
    paidByAccessId.set(access.id, paid);
    for (const uid of access.authUids ?? []) {
      paidByAccessId.set(uid, paid);
    }
  }

  return players.map((player) => {
    const accessPaid = paidByAccessId.get(player.id);
    return accessPaid === undefined ? player : { ...player, paid: accessPaid };
  });
}
