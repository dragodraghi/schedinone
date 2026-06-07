import type { Game } from "./types";

export function getAdminPlayerUid(game: Game | null, uid: string | undefined): string | null {
  if (!game || !uid || !game.admins.includes(uid)) return null;
  const mappedUid = game.adminPlayerUids?.[uid];
  return typeof mappedUid === "string" && mappedUid.trim() ? mappedUid : null;
}

export function getPlayerDeviceAliasUid(game: Game | null, uid: string | undefined): string | null {
  if (!game || !uid || game.admins.includes(uid)) return null;
  const mappedUid = game.playerDeviceAliases?.[uid];
  return typeof mappedUid === "string" && mappedUid.trim() ? mappedUid : null;
}

export function getEffectivePlayerUid(game: Game | null, uid: string | undefined): string | undefined {
  if (!uid) return undefined;
  return getAdminPlayerUid(game, uid) ?? getPlayerDeviceAliasUid(game, uid) ?? uid;
}
