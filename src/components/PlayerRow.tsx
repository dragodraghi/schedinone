const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface Props {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export default function PlayerRow({ rank, name, points, isCurrentUser }: Props) {
  const medal = medals[rank];
  const isTop3 = rank <= 3;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
        isCurrentUser ? "glass border border-[#00d4ff]/40" : "glass"
      }`}
      style={isCurrentUser ? { boxShadow: "0 0 24px rgba(0, 212, 255, 0.12)" } : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
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
