import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game } from "../lib/types";

export function useGame(gameId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setGame({ id: snap.id, ...snap.data() } as Game);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [gameId]);

  return { game, loading };
}
