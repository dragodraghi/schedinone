import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player } from "../lib/types";

export function usePlayers(gameId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "games", gameId, "players");
    const q = query(ref, orderBy("points", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        joinedAt: d.data().joinedAt?.toDate(),
      })) as Player[];
      setPlayers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [gameId]);

  return { players, loading };
}
