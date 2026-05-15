import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";
import type { Sign } from "./types";

type SaveScheduleRequest = {
  gameId: string;
  predictions: Record<string, Sign>;
  topScorerPick: string;
  winnerPick: string;
  submit: boolean;
};

type SaveScheduleResponse = {
  ok: boolean;
  scheduleStatus: "bozza" | "inviata";
};

export async function saveSchedule(input: SaveScheduleRequest): Promise<SaveScheduleResponse> {
  const fn = httpsCallable<SaveScheduleRequest, SaveScheduleResponse>(
    getFunctions(app, "europe-west1"),
    "saveSchedule"
  );
  const res = await fn(input);
  return res.data;
}
