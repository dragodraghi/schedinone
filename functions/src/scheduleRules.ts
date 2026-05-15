import * as admin from "firebase-admin";

export const DEFAULT_LOCK_LEAD_HOURS = 24;
const MAX_LOCK_LEAD_HOURS = 24 * 14;

function asValidHours(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_LOCK_LEAD_HOURS) return null;
  return value;
}

export function requireCurrentPhase(gameData: admin.firestore.DocumentData): string {
  if (typeof gameData.currentPhase !== "string" || !gameData.currentPhase.trim()) {
    throw new Error("missing-current-phase");
  }
  return gameData.currentPhase.trim();
}

export function getLockLeadHours(
  gameData: admin.firestore.DocumentData,
  phase: unknown
): number {
  if (
    typeof phase === "string" &&
    gameData.phaseLockLeadHours &&
    typeof gameData.phaseLockLeadHours === "object" &&
    !Array.isArray(gameData.phaseLockLeadHours)
  ) {
    const phaseHours = asValidHours((gameData.phaseLockLeadHours as Record<string, unknown>)[phase]);
    if (phaseHours !== null) return phaseHours;
  }

  const gameHours = asValidHours(gameData.lockLeadHours);
  return gameHours ?? DEFAULT_LOCK_LEAD_HOURS;
}

export function getLockLeadMs(
  gameData: admin.firestore.DocumentData,
  phase: unknown
): number {
  return getLockLeadHours(gameData, phase) * 60 * 60 * 1000;
}

export function getMaxLockLeadMs(gameData: admin.firestore.DocumentData): number {
  const hours = [getLockLeadHours(gameData, undefined)];
  if (
    gameData.phaseLockLeadHours &&
    typeof gameData.phaseLockLeadHours === "object" &&
    !Array.isArray(gameData.phaseLockLeadHours)
  ) {
    for (const value of Object.values(gameData.phaseLockLeadHours as Record<string, unknown>)) {
      const phaseHours = asValidHours(value);
      if (phaseHours !== null) hours.push(phaseHours);
    }
  }
  return Math.max(...hours) * 60 * 60 * 1000;
}

export function isMatchClosed(
  gameData: admin.firestore.DocumentData,
  matchData: admin.firestore.DocumentData,
  now: Date
): boolean {
  if (matchData.locked === true) return true;
  const kickoff = matchData.kickoff?.toDate?.();
  if (!(kickoff instanceof Date)) return false;
  return kickoff.getTime() <= now.getTime() + getLockLeadMs(gameData, matchData.phase);
}
