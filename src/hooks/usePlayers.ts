import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player, ScheduleStatus, Sign } from "../lib/types";

function asScheduleStatus(value: unknown): ScheduleStatus {
  if (value === "inviata" || value === "accettata" || value === "rifiutata") return value;
  return "bozza";
}

export function usePlayers(gameId: string, enabled = true) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const ref = collection(db, "games", gameId, "players");
    const q = query(ref, orderBy("points", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Giocatore",
            joinedAt: raw.joinedAt?.toDate?.() ?? new Date(0),
            predictions:
              raw.predictions && typeof raw.predictions === "object"
                ? (raw.predictions as Record<string, Sign>)
                : {},
            topScorerPick: typeof raw.topScorerPick === "string" ? raw.topScorerPick : "",
            winnerPick: typeof raw.winnerPick === "string" ? raw.winnerPick : "",
            points: Number.isFinite(Number(raw.points)) ? Number(raw.points) : 0,
            paid: raw.paid === true,
            scheduleStatus: asScheduleStatus(raw.scheduleStatus),
          } satisfies Player;
        });
        setPlayers(data);
        setLoading(false);
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { players, loading };
}
