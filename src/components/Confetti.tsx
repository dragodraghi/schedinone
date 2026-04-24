import { useMemo } from "react";

interface Props {
  active: boolean;
  /** How many confetti pieces. Default 60. */
  count?: number;
  /** Duration before auto-clean (ms). Default 3500. */
  duration?: number;
}

const COLORS = ["#00d4ff", "#ffd700", "#00ff88", "#ff3366", "#a855f7"];

interface Piece {
  id: number;
  color: string;
  x: string;
  drift: string;
  rot: string;
  delay: string;
  dur: string;
  width: number;
}

function createRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickInRange(random: () => number, min: number, max: number): number {
  return min + (max - min) * random();
}

function createPieces(count: number, seed: number): Piece[] {
  const random = createRng(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLORS[Math.floor(random() * COLORS.length)],
    x: `${pickInRange(random, 0, 100).toFixed(2)}vw`,
    drift: `${pickInRange(random, -120, 120).toFixed(1)}px`,
    rot: `${pickInRange(random, 360, 1080).toFixed(1)}deg`,
    delay: `${pickInRange(random, 0, 0.6).toFixed(2)}s`,
    dur: `${pickInRange(random, 1.8, 3.2).toFixed(2)}s`,
    width: random() < 0.3 ? 6 : 10,
  }));
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

  const pieces = useMemo(
    () => (active && !reduced ? createPieces(count, count * 9973) : []),
    [active, reduced, count]
  );

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
