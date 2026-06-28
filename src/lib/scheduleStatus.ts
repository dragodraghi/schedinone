import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { ScheduleStatus } from "./types";

export interface UpdateScheduleStatusesReport {
  ok: boolean;
  playersUpdated: number;
}

type UpdateScheduleStatusesResponse = Partial<Record<keyof UpdateScheduleStatusesReport, unknown>>;

export async function updateScheduleStatuses(
  gameId: string,
  playerIds: string[],
  status: ScheduleStatus
): Promise<UpdateScheduleStatusesReport> {
  const callable = httpsCallable<
    { gameId: string; playerIds: string[]; status: ScheduleStatus },
    UpdateScheduleStatusesResponse
  >(functions, "updateScheduleStatuses");
  const result = await callable({ gameId, playerIds, status });
  const data = result.data ?? {};

  return {
    ok: data.ok === true,
    playersUpdated: Number.isFinite(Number(data.playersUpdated)) ? Number(data.playersUpdated) : 0,
  };
}
