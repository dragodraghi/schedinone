import { useMemo } from "react";

interface Props {
  active: boolean;
  /** How many confetti pieces. Default 60. */
  count?: number;
}

const COLORS = ["#00d4ff", "#ffd700", "#00ff88", "#ff3366", "#a855f7"];

function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const fraction = x - Math.floor(x);
  return fraction * (max - min) + min;
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
export default function Confetti({ active, count = 60 }: Props) {
  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  const pieces: Piece[] = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(seededRand(i + 1, 0, COLORS.length))],
      x: `${seededRand(i + 11, 0, 100)}vw`,
      drift: `${seededRand(i + 23, -120, 120)}px`,
      rot: `${seededRand(i + 37, 360, 1080)}deg`,
      delay: `${seededRand(i + 41, 0, 0.6).toFixed(2)}s`,
      dur: `${seededRand(i + 53, 1.8, 3.2).toFixed(2)}s`,
      width: seededRand(i + 67, 0, 1) < 0.3 ? 6 : 10,
    }));
  }, [active, count]);

  if (!active || reduced) return null;

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
