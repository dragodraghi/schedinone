import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game } from "../lib/types";

export function useGame(gameId: string, enabled = true) {
  const [game, setGame] = useState<Game | null>(null);
  // hasReceived is only set to true AFTER a snapshot (success or error) arrives
  // for the current `enabled=true` session. This avoids the "Gioco non trovato"
  // flash during the transition from enabled=false → enabled=true where the
  // previous state showed loading=false.
  const [hasReceived, setHasReceived] = useState(false);

  useEffect(() => {
    // Reset on every effect run — whenever enabled/gameId changes, we're
    // starting a fresh fetch cycle and should not trust the previous snapshot.
    setHasReceived(false);

    if (!enabled) {
      // We don't fetch; keep hasReceived=false so App.tsx still sees us as
      // loading and shows the spinner instead of the "not found" error.
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
        } else {
          setGame(null);
        }
        setHasReceived(true);
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setHasReceived(true);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { game, loading: !hasReceived };
}
