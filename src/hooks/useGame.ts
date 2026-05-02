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
