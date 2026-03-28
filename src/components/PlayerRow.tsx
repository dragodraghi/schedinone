const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface Props {
  rank: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export default function PlayerRow({ rank, name, points, isCurrentUser }: Props) {
  const medal = medals[rank];
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isCurrentUser ? "bg-blue-600/20 border border-blue-500" : "bg-slate-800"}`}>
      <div className="flex items-center gap-3">
        <span className="w-8 text-center font-bold text-sm">{medal ?? rank}</span>
        <span className="font-medium">{name}</span>
      </div>
      <span className="font-bold">{points} pt</span>
    </div>
  );
}
