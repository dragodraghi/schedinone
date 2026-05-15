import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player, ScheduleStatus, Sign } from "../lib/types";

function asScheduleStatus(value: unknown): ScheduleStatus {
  if (value === "inviata" || value === "accettata" || value === "rifiutata") return value;
  return "bozza";
}

function toPlayer(id: string, raw: Record<string, unknown>): Player {
  return {
    id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Giocatore",
    joinedAt:
      raw.joinedAt &&
      typeof raw.joinedAt === "object" &&
      "toDate" in raw.joinedAt &&
      typeof raw.joinedAt.toDate === "function"
        ? raw.joinedAt.toDate()
        : new Date(0),
    predictions:
      raw.predictions && typeof raw.predictions === "object"
        ? (raw.predictions as Record<string, Sign>)
        : {},
    topScorerPick: typeof raw.topScorerPick === "string" ? raw.topScorerPick : "",
    winnerPick: typeof raw.winnerPick === "string" ? raw.winnerPick : "",
    points: Number.isFinite(Number(raw.points)) ? Number(raw.points) : 0,
    paid: raw.paid === true,
    scheduleStatus: asScheduleStatus(raw.scheduleStatus),
  };
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
        const data = snap.docs.map((d) => toPlayer(d.id, d.data()));
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

export function usePublicPlayers(gameId: string, enabled = true) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const ref = collection(db, "games", gameId, "publicPlayers");
    const q = query(ref, orderBy("points", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPlayers(snap.docs.map((d) => toPlayer(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.debug("Public players listener waiting for auth", err.code);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [gameId, enabled]);

  return { players, loading };
}

export function useCurrentPlayer(gameId: string, playerId: string | undefined, enabled = true) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const active = enabled && !!playerId;

  useEffect(() => {
    if (!active) {
      return;
    }
    const ref = doc(db, "games", gameId, "players", playerId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setPlayer(snap.exists() ? toPlayer(snap.id, snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        console.debug("Current player listener waiting for auth", err.code);
        setPlayer(null);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [gameId, playerId, active]);

  return { player: active ? player : null, loading: active ? loading : false };
}
