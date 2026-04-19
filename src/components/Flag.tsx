import { getFlagCode } from "../lib/flags";

interface Props {
  team: string;
  size?: number; // rendered height in px (width auto). Default 14.
  rounded?: boolean;
  className?: string;
}

/**
 * Renders a national flag as an <img> backed by flagcdn.com.
 * Falls back to 🏳️ when the team name isn't in the map.
 *
 * Why not emoji? Windows/Chromium doesn't render flag emoji (shows "MX" instead of 🇲🇽).
 * flagcdn serves consistent SVG/PNG across every OS.
 */
export default function Flag({ team, size = 14, rounded = true, className = "" }: Props) {
  const code = getFlagCode(team);
  if (!code) {
    return (
      <span className={className} aria-hidden="true" style={{ fontSize: size }}>
        🏳️
      </span>
    );
  }
  // flagcdn width buckets: w20, w40, w80, w160, w320, w640, w1280, w2560
  // Pick the smallest bucket >= 2× requested size (for HiDPI).
  const targetPx = Math.ceil(size * 2);
  const bucket = [20, 40, 80, 160, 320].find((b) => b >= targetPx) ?? 40;
  const aspect = 4 / 3; // approximate; most flags are 3:2 or 5:3 — auto width handles real ratio
  return (
    <img
      src={`https://flagcdn.com/w${bucket}/${code}.png`}
      srcSet={`https://flagcdn.com/w${bucket * 2}/${code}.png 2x`}
      alt={team}
      width={size * aspect}
      height={size}
      loading="eager"
      decoding="async"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        borderRadius: rounded ? 2 : 0,
        objectFit: "cover",
        boxShadow: "0 0 0 0.5px rgba(255,255,255,0.15)",
      }}
    />
  );
}
