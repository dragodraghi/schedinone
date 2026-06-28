import * as admin from "firebase-admin";

export type PublicScheduleStatus = "bozza" | "inviata" | "accettata" | "rifiutata";

export function asPublicScheduleStatus(value: unknown): PublicScheduleStatus {
  if (value === "inviata" || value === "accettata" || value === "rifiutata") return value;
  return "bozza";
}

export function buildPublicPlayerData(data: admin.firestore.DocumentData) {
  const status = asPublicScheduleStatus(data.scheduleStatus);
  const accepted = status === "accettata";

  return {
    name: typeof data.name === "string" ? data.name : "Giocatore",
    joinedAt: data.joinedAt ?? null,
    points: Number.isFinite(Number(data.points)) ? Number(data.points) : 0,
    previousRank: Number.isFinite(Number(data.previousRank)) ? Number(data.previousRank) : null,
    paid: data.paid === true,
    scheduleStatus: status,
    predictions:
      accepted && data.predictions && typeof data.predictions === "object"
        ? data.predictions
        : {},
    topScorerPick: accepted && typeof data.topScorerPick === "string" ? data.topScorerPick : "",
    winnerPick: accepted && typeof data.winnerPick === "string" ? data.winnerPick : "",
  };
}
