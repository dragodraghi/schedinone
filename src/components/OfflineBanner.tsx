import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import Toast, { type ToastData } from "./Toast";

/**
 * Connectivity feedback for the PWA: a persistent bar while offline and a brief
 * confirmation toast when the connection comes back. Rendered in the app shell
 * so it covers both the player and admin sessions.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Confirm reconnection from the event handlers themselves (rather than
  // reacting to `online` in an effect body) so setState stays out of the
  // synchronous effect path.
  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true;
    };
    const handleOnline = () => {
      if (wasOffline.current) {
        wasOffline.current = false;
        setToast({ message: "Di nuovo online", type: "success" });
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <>
      <Toast toast={toast} onDone={() => setToast(null)} />
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="text-xs font-bold text-center px-4"
          style={{
            fontFamily: "Outfit, sans-serif",
            background: "rgba(255, 193, 7, 0.14)",
            borderBottom: "1px solid rgba(255, 193, 7, 0.4)",
            color: "#ffc107",
            backdropFilter: "blur(8px)",
            paddingTop: "max(8px, env(safe-area-inset-top))",
            paddingBottom: 8,
          }}
        >
          ⚠ Sei offline — i dati potrebbero non essere aggiornati
        </div>
      )}
    </>
  );
}
