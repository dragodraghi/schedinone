import { useEffect, useMemo, useState } from "react";

interface Props {
  active: boolean;
  /** How many confetti pieces. Default 60. */
  count?: number;
  /** Duration before auto-clean (ms). Default 3500. */
  duration?: number;
}

const COLORS = ["#00d4ff", "#ffd700", "#00ff88", "#ff3366", "#a855f7"];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

interface Piece {
  id: number;
  color: string;
  x: string;      // starting %
  drift: string;  // px drift while falling
  rot: string;    // final rotation
  delay: string;  // stagger
  dur: string;    // fall duration
  width: number;
}

/**
 * Lightweight CSS-driven confetti. Renders fixed-position pieces that fall and rotate.
 * Respects prefers-reduced-motion (renders nothing).
 */
export default function Confetti({ active, count = 60, duration = 3500 }: Props) {
  const [visible, setVisible] = useState(false);
  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    if (!active || reduced) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [active, reduced, duration]);

  const pieces: Piece[] = useMemo(() => {
    if (!visible) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: `${rand(0, 100)}vw`,
      drift: `${rand(-120, 120)}px`,
      rot: `${rand(360, 1080)}deg`,
      delay: `${rand(0, 0.6).toFixed(2)}s`,
      dur: `${rand(1.8, 3.2).toFixed(2)}s`,
      width: Math.random() < 0.3 ? 6 : 10,
    }));
  }, [visible, count]);

  if (!visible || reduced) return null;

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.x,
            background: p.color,
            width: p.width,
            height: p.width * 1.6,
            borderRadius: p.width < 10 ? "50%" : "2px",
            ["--drift" as string]: p.drift,
            ["--rot" as string]: p.rot,
            ["--delay" as string]: p.delay,
            ["--dur" as string]: p.dur,
          }}
        />
      ))}
    </div>
  );
}
