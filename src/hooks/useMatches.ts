import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { KickoffSource, Match, Phase, Sign } from "../lib/types";

function asPhase(value: unknown): Phase {
  if (
    value === "ottavi" ||
    value === "quarti" ||
    value === "semifinali" ||
    value === "finale"
  ) {
    return value;
  }
  return "gironi";
}

function asSign(value: unknown): Sign | null {
  if (value === "1" || value === "X" || value === "2") return value;
  return null;
}

function asKickoffSource(value: unknown): KickoffSource | undefined {
  if (value === "synthetic" || value === "api" || value === "manual") return value;
  return undefined;
}

export function useMatches(gameId: string, enabled = true) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const ref = collection(db, "games", gameId, "matches");
    const q = query(ref, orderBy("kickoff"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            phase: asPhase(raw.phase),
            group: typeof raw.group === "string" ? raw.group : null,
            homeTeam: typeof raw.homeTeam === "string" ? raw.homeTeam : "Casa",
            awayTeam: typeof raw.awayTeam === "string" ? raw.awayTeam : "Trasferta",
            kickoff: raw.kickoff?.toDate?.() ?? new Date(0),
            kickoffSource: asKickoffSource(raw.kickoffSource),
            result: asSign(raw.result),
            score: typeof raw.score === "string" ? raw.score : null,
            locked: raw.locked === true,
          } satisfies Match;
        });
        setMatches(data);
        setLoading(false);
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { matches, loading };
}
