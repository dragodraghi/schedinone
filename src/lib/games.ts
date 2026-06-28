export const CLASSIC_GAME_ID = import.meta.env.VITE_GAME_ID || "schedinone-2026";
export const GOLDEN_GAME_ID = "schedinone-golden-plus-2026";

export function isGoldenGameId(gameId: string): boolean {
  return gameId === GOLDEN_GAME_ID;
}
