function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
      .map(([key, mappedUid]) => [key, mappedUid.trim()])
  );
}

export function resolveSchedulePlayerUid(
  uid: string,
  signInProvider: unknown,
  gameData: { admins?: unknown; adminPlayerUids?: unknown; playerDeviceAliases?: unknown }
): string | null {
  const admins = asStringArray(gameData.admins);
  const isAdmin = admins.includes(uid);

  if (signInProvider === "anonymous") {
    return isAdmin ? null : asStringRecord(gameData.playerDeviceAliases)[uid] ?? uid;
  }

  if (!isAdmin) return null;

  return asStringRecord(gameData.adminPlayerUids)[uid] ?? null;
}
