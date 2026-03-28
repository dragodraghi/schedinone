import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Match } from "../lib/types";

export function useMatches(gameId: string) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "games", gameId, "matches");
    const q = query(ref, orderBy("kickoff"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        kickoff: d.data().kickoff?.toDate(),
      })) as Match[];
      setMatches(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [gameId]);

  return { matches, loading };
}
