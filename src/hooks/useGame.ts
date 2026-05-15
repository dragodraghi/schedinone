import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game, Phase } from "../lib/types";

function asPhase(value: unknown): Phase {
  if (
    value === "gironi" ||
    value === "ottavi" ||
    value === "quarti" ||
    value === "semifinali" ||
    value === "finale"
  ) {
    return value;
  }
  return "gironi";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asLockLeadHours(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function asPhaseLockLeadHours(value: unknown): Partial<Record<Phase, number>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Partial<Record<Phase, number>> = {};
  for (const [rawPhase, rawHours] of Object.entries(value)) {
    const phase = asPhase(rawPhase);
    const hours = asLockLeadHours(rawHours);
    if (rawPhase === phase && hours !== undefined) {
      out[phase] = hours;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function useGame(gameId: string, enabled = true) {
  const [game, setGame] = useState<Game | null>(null);
  const [hasReceived, setHasReceived] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ref = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setGame({
            id: snap.id,
            name: typeof data.name === "string" ? data.name : "Schedinone",
            entryFee: Number(data.entryFee) || 0,
            admins: asStringArray(data.admins),
            accessCode: typeof data.accessCode === "string" ? data.accessCode : "",
            adminCode: typeof data.adminCode === "string" ? data.adminCode : undefined,
            adminCodeHash: typeof data.adminCodeHash === "string" ? data.adminCodeHash : undefined,
            lockLeadHours: asLockLeadHours(data.lockLeadHours),
            phaseLockLeadHours: asPhaseLockLeadHours(data.phaseLockLeadHours),
            phases: asStringArray(data.phases).map(asPhase),
            currentPhase: asPhase(data.currentPhase),
            topScorer: typeof data.topScorer === "string" ? data.topScorer : null,
            winner: typeof data.winner === "string" ? data.winner : null,
          } satisfies Game);
        } else {
          setGame(null);
        }
        setActiveGameId(gameId);
        setHasReceived(true);
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setActiveGameId(gameId);
        setHasReceived(true);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { game, loading: !enabled || activeGameId !== gameId || !hasReceived };
}
