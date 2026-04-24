import { useState } from "react";
import { shareInvite, copyInvite } from "../lib/invite";
import { vibrate } from "../lib/haptic";
import Toast, { type ToastData } from "./Toast";

interface Props {
  accessCode: string;
}

/**
 * "Invita amici" button — tries Web Share API (iOS/Android native share sheet),
 * falls back to opening WhatsApp. Also offers a "Copia messaggio" secondary
 * action for anyone who wants to paste it somewhere else.
 */
export default function InviteButton({ accessCode }: Props) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    vibrate("tap");
    setSharing(true);
    try {
      const ok = await shareInvite(accessCode);
      if (ok) setToast({ message: "Apertura condivisione...", type: "info" });
    } catch {
      setToast({ message: "Errore nella condivisione", type: "error" });
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    vibrate("tap");
    const ok = await copyInvite(accessCode);
    setToast({
      message: ok ? "Messaggio copiato! Incollalo dove vuoi." : "Copia non riuscita",
      type: ok ? "success" : "error",
    });
  };

  return (
    <div className="space-y-2">
      <Toast toast={toast} onDone={() => setToast(null)} />
      <button
        onClick={handleShare}
        disabled={sharing}
        className="btn-glow w-full py-3 rounded-xl font-black text-sm tracking-wider transition-all"
        style={{
          fontFamily: "Outfit, sans-serif",
          background: "linear-gradient(135deg, #25d366, #128c7e)",
          color: "white",
          boxShadow: "0 0 20px rgba(37, 211, 102, 0.25)",
          opacity: sharing ? 0.6 : 1,
        }}
      >
        📤 Invita amici
      </button>
      <button
        onClick={handleCopy}
        className="glass w-full py-2 rounded-xl font-bold text-xs transition-all"
        style={{
          fontFamily: "Outfit, sans-serif",
          color: "var(--text-muted)",
        }}
      >
        📋 Copia messaggio
      </button>
    </div>
  );
}
