import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player } from "../lib/types";

export function usePlayers(gameId: string, enabled = true) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const ref = collection(db, "games", gameId, "players");
    const q = query(ref, orderBy("points", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          scheduleStatus: "bozza",
          ...d.data(),
          joinedAt: d.data().joinedAt?.toDate(),
        })) as Player[];
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
