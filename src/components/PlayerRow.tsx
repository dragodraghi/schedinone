const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface Props {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
  /** Rank held before the last results were entered. Drives the movement
   *  indicator. null/undefined = no prior snapshot, so no arrow is shown. */
  previousRank?: number | null;
}

/**
 * Small fixed-width slot showing how the player moved since the previous
 * standings: green ▲ up, red ▼ down, muted = unchanged. The slot keeps its
 * width in every state so rows stay aligned and nothing shifts.
 */
function MovementIndicator({ rank, previousRank }: { rank: number; previousRank?: number | null }) {
  const movement = previousRank != null ? previousRank - rank : null;

  let glyph = "";
  let color = "var(--text-muted)";
  let label = "";
  if (movement !== null) {
    if (movement > 0) {
      glyph = "▲";
      color = "var(--correct)";
      label = `Salito di ${movement} ${movement === 1 ? "posizione" : "posizioni"}`;
    } else if (movement < 0) {
      glyph = "▼";
      color = "var(--wrong)";
      label = `Sceso di ${-movement} ${movement === -1 ? "posizione" : "posizioni"}`;
    } else {
      glyph = "=";
      label = "Posizione invariata";
    }
  }

  return (
    <span
      className="w-3.5 shrink-0 flex items-center justify-center leading-none select-none"
      style={{ fontSize: "11px", color, fontFamily: "Outfit, sans-serif" }}
      aria-label={label || undefined}
      title={label || undefined}
    >
      {glyph}
    </span>
  );
}

export default function PlayerRow({ rank, name, points, isCurrentUser, previousRank }: Props) {
  const medal = medals[rank];
  const isTop3 = rank <= 3;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
        isCurrentUser ? "glass border border-[#00d4ff]/40" : "glass"
      }`}
      style={isCurrentUser ? { boxShadow: "0 0 24px rgba(0, 212, 255, 0.12)" } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MovementIndicator rank={rank} previousRank={previousRank} />
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: isTop3 ? "#040810" : "var(--text-muted)",
            background: isTop3 ? "linear-gradient(135deg, var(--gold), #c8a000)" : "rgba(255,255,255,0.05)",
            border: isTop3 ? "none" : "1px solid var(--border)",
          }}
        >
          {medal ?? rank}
        </span>
        <div className="min-w-0">
          <span
            className="block font-bold truncate"
            style={{ fontFamily: "Outfit, sans-serif", color: isCurrentUser ? "var(--accent)" : "var(--text-primary)" }}
          >
            {name}
          </span>
          {isCurrentUser && (
            <span className="micro-label" style={{ color: "var(--accent)" }}>
              La tua squadra
            </span>
          )}
        </div>
      </div>
      <span className="font-black text-lg shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: isTop3 ? "var(--gold)" : "var(--text-primary)" }}>
        {points} <span className="text-xs" style={{ color: "var(--text-muted)" }}>pt</span>
      </span>
    </div>
  );
}
