import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Match } from "../lib/types";

interface MatchesState {
  matches: Match[];
  hasReceived: boolean;
  key: string;
}

export function useMatches(gameId: string, enabled = true) {
  const [state, setState] = useState<MatchesState>({
    matches: [],
    hasReceived: false,
    key: "",
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const ref = collection(db, "games", gameId, "matches");
    const q = query(ref, orderBy("kickoff"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          kickoff: d.data().kickoff?.toDate(),
        })) as Match[];
        setState({ matches: data, hasReceived: true, key: gameId });
      },
      (err) => {
        console.debug("Firestore listener waiting for auth", err.code);
        setState({ matches: [], hasReceived: true, key: gameId });
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  const isCurrentGame = state.key === gameId;
  return {
    matches: isCurrentGame ? state.matches : [],
    loading: enabled ? !isCurrentGame || !state.hasReceived : false,
  };
}
