import { useEffect, useState } from "react";

/**
 * Tracks the browser's network connectivity via `navigator.onLine` plus the
 * `online`/`offline` events. Returns `true` when online (and on environments
 * without `navigator`, so it never blocks rendering server-side or in tests).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
