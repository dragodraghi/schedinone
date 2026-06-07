import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

type RecalcPointsResponse = {
  ok?: boolean;
  playersUpdated?: unknown;
  matchesCounted?: unknown;
};

export interface RecalcPointsReport {
  playersUpdated: number;
  matchesCounted: number;
}

export async function recalcPointsClient(gameId: string): Promise<RecalcPointsReport> {
  const recalculatePointsNow = httpsCallable<{ gameId: string }, RecalcPointsResponse>(
    functions,
    "recalculatePointsNow"
  );
  const result = await recalculatePointsNow({ gameId });
  const data = result.data ?? {};

  return {
    playersUpdated: Number.isFinite(Number(data.playersUpdated)) ? Number(data.playersUpdated) : 0,
    matchesCounted: Number.isFinite(Number(data.matchesCounted)) ? Number(data.matchesCounted) : 0,
  };
}
