import { useEffect, useState } from "react";

export interface ToastData {
  message: string;
  type: "success" | "error" | "info";
}

const config = {
  success: { icon: "\u2713", color: "var(--correct)", bg: "rgba(0,255,136,0.12)", border: "rgba(0,255,136,0.4)" },
  error: { icon: "\u2717", color: "var(--wrong)", bg: "rgba(255,51,102,0.12)", border: "rgba(255,51,102,0.4)" },
  info: { icon: "\u2139", color: "var(--accent)", bg: "rgba(0,212,255,0.12)", border: "rgba(0,212,255,0.4)" },
};

interface Props {
  toast: ToastData | null;
  onDone: () => void;
  duration?: number;
}

export default function Toast({ toast, onDone, duration = 3000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onDone]);

  if (!toast) return null;

  const c = config[toast.type];

  return (
    <div
      className={`fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold toast-animate ${visible ? "toast-in" : "toast-out"}`}
      style={{
        transform: "translateX(-50%)",
        fontFamily: "Outfit, sans-serif",
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        backdropFilter: "blur(12px)",
        boxShadow: `0 4px 24px ${c.bg}`,
        pointerEvents: "none",
      }}
    >
      {c.icon} {toast.message}
    </div>
  );
}
