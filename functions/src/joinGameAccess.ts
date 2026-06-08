export function resolveExtraDeviceLinkTarget(
  currentUid: string,
  matchingPlayerUid: string,
  playerData: {
    multiDeviceEnabled?: unknown;
    scheduleStatus?: unknown;
    predictions?: unknown;
    topScorerPick?: unknown;
    winnerPick?: unknown;
  }
): string | null {
  if (!currentUid || !matchingPlayerUid || currentUid === matchingPlayerUid) return null;
  if (playerData.multiDeviceEnabled === true) return matchingPlayerUid;
  return isFreshDraftPlayer(playerData) ? matchingPlayerUid : null;
}

const RESERVED_PLAYER_NAMES = new Set([
  "admin",
  "administrator",
  "amministratore",
  "comitato",
  "committee",
  "staff",
]);

export function isReservedPlayerName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("@")) return true;
  return RESERVED_PLAYER_NAMES.has(normalized);
}

function isFreshDraftPlayer(playerData: {
  scheduleStatus?: unknown;
  predictions?: unknown;
  topScorerPick?: unknown;
  winnerPick?: unknown;
}): boolean {
  const status =
    typeof playerData.scheduleStatus === "string" && playerData.scheduleStatus.trim()
      ? playerData.scheduleStatus
      : "bozza";
  if (status !== "bozza") return false;
  if (hasAnyPrediction(playerData.predictions)) return false;
  if (hasNonEmptyString(playerData.topScorerPick)) return false;
  if (hasNonEmptyString(playerData.winnerPick)) return false;
  return true;
}

function hasAnyPrediction(value: unknown): boolean {
  if (!value) return false;
  if (typeof value !== "object") return true;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
