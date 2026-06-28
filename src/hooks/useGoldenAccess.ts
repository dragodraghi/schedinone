import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { GoldenAccess, GoldenAccessStatus, GoldenAccessType } from "../lib/types";

function asStatus(value: unknown): GoldenAccessStatus {
  if (value === "approved" || value === "rejected" || value === "revoked") return value;
  return "pending";
}

function asType(value: unknown): GoldenAccessType {
  return value === "classic-player" ? "classic-player" : "new-request";
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

function toGoldenAccess(id: string, data: Record<string, unknown>): GoldenAccess {
  return {
    id,
    status: asStatus(data.status),
    type: asType(data.type),
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    contact: typeof data.contact === "string" ? data.contact : undefined,
    classicPlayerUid: typeof data.classicPlayerUid === "string" ? data.classicPlayerUid : undefined,
    authUids: asStringArray(data.authUids),
    paid: data.paid === true,
  };
}

export function useGoldenAccess(gameId: string, uid: string | null, enabled = true) {
  const [access, setAccess] = useState<GoldenAccess | null>(null);
  const [loading, setLoading] = useState(enabled && !!uid);

  useEffect(() => {
    if (!enabled || !uid) {
      setAccess(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "games", gameId, "access", uid),
      (snap) => {
        if (!snap.exists()) {
          setAccess(null);
          setLoading(false);
          return;
        }

        setAccess(toGoldenAccess(snap.id, snap.data()));
        setLoading(false);
      },
      (err) => {
        console.debug("Golden access listener waiting for auth", err.code);
        setAccess(null);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [enabled, gameId, uid]);

  return { access, loading };
}

export function useGoldenAccessList(gameId: string, enabled = true) {
  const [accessItems, setAccessItems] = useState<GoldenAccess[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setAccessItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "games", gameId, "access"),
      (snap) => {
        setAccessItems(snap.docs.map((accessDoc) => toGoldenAccess(accessDoc.id, accessDoc.data())));
        setLoading(false);
      },
      (err) => {
        console.debug("Golden access list listener waiting for auth", err.code);
        setAccessItems([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [enabled, gameId]);

  return { accessItems, loading };
}
