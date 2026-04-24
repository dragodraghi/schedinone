import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player } from "../lib/types";

interface PlayersState {
  players: Player[];
  hasReceived: boolean;
  key: string;
}

export function usePlayers(gameId: string, enabled = true) {
  const [state, setState] = useState<PlayersState>({
    players: [],
    hasReceived: false,
    key: "",
  });

  useEffect(() => {
    if (!enabled) {
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
        setState({ players: data, hasReceived: true, key: gameId });
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setState({ players: [], hasReceived: true, key: gameId });
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  const isCurrentGame = state.key === gameId;
  return {
    players: isCurrentGame ? state.players : [],
    loading: enabled ? !isCurrentGame || !state.hasReceived : false,
  };
}
