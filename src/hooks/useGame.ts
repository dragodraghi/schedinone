import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game } from "../lib/types";

export function useGame(gameId: string, enabled = true) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const ref = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setGame({
            id: snap.id,
            ...data,
            admins: data.admins ?? [],
            entryFee: Number(data.entryFee) || 0,
          } as Game);
        }
        setLoading(false);
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { game, loading };
}
