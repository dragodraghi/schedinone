import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game } from "../lib/types";

interface GameState {
  game: Game | null;
  hasReceived: boolean;
  key: string;
}

export function useGame(gameId: string, enabled = true) {
  const [state, setState] = useState<GameState>({
    game: null,
    hasReceived: false,
    key: "",
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const ref = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setState({
            game: {
              id: snap.id,
              ...data,
              admins: data.admins ?? [],
              entryFee: Number(data.entryFee) || 0,
            } as Game,
            hasReceived: true,
            key: gameId,
          });
        } else {
          setState({ game: null, hasReceived: true, key: gameId });
        }
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setState({ game: null, hasReceived: true, key: gameId });
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  const isCurrentGame = state.key === gameId;
  return {
    game: isCurrentGame ? state.game : null,
    loading: enabled ? !isCurrentGame || !state.hasReceived : true,
  };
}
