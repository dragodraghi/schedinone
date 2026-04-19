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
        isCurrentUser
          ? "glass border border-[#00d4ff]/40"
          : "glass"
      }`}
      style={isCurrentUser ? { boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' } : undefined}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-center font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {medal ?? <span style={{ color: 'var(--text-muted)' }}>{rank}</span>}
        </span>
        <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif', color: isCurrentUser ? 'var(--accent)' : 'var(--text-primary)' }}>
          {name}
        </span>
      </div>
      <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: isTop3 ? 'var(--gold)' : 'var(--text-primary)' }}>
        {points} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>pt</span>
      </span>
    </div>
  );
}
