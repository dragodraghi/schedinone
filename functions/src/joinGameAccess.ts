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

export type JoinGameMode = "classic" | "golden-plus";

type GameAliasData = {
  playerDeviceAliases?: unknown;
};

export type JoinIdentityInput = {
  gameMode: JoinGameMode;
  name?: unknown;
  code?: unknown;
  accessData?: Record<string, unknown>;
};

export function resolveJoinIdentity(input: JoinIdentityInput): {
  effectiveName: string;
  skipCodeCheck: boolean;
} {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim() : "";

  if (input.gameMode === "golden-plus") {
    const accessData = input.accessData ?? {};
    if (accessData.status !== "approved") {
      throw new Error("Accesso Golden Plus non autorizzato.");
    }
    if (typeof accessData.displayName !== "string" || !accessData.displayName.trim()) {
      throw new Error("Accesso Golden Plus incompleto.");
    }
    return {
      effectiveName: accessData.displayName.trim(),
      skipCodeCheck: true,
    };
  }

  if (!name || !code) {
    throw new Error("Parametri mancanti o non validi.");
  }
  return {
    effectiveName: name,
    skipCodeCheck: false,
  };
}

const RESERVED_PLAYER_NAMES = new Set([
  "admin",
  "administrator",
  "amministratore",
  "comitato",
  "committee",
  "staff",
]);

export function canonicalPlayerNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

export function isReservedPlayerName(name: string): boolean {
  if (name.includes("@")) return true;
  const normalized = canonicalPlayerNameKey(name);
  if (!normalized) return false;
  return RESERVED_PLAYER_NAMES.has(normalized);
}

export function goldenAccessCandidateUids(
  currentUid: string,
  gameData?: GameAliasData,
  sourceGameData?: GameAliasData
): string[] {
  const out: string[] = [];
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const uid = value.trim();
    if (uid && !out.includes(uid)) out.push(uid);
  };
  const addAlias = (data?: GameAliasData) => {
    const aliases = data?.playerDeviceAliases;
    if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) return;
    add((aliases as Record<string, unknown>)[currentUid]);
  };

  add(currentUid);
  addAlias(gameData);
  addAlias(sourceGameData);
  return out;
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
