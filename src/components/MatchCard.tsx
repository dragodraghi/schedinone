import type { Match, Sign } from "../lib/types";

const signs: Sign[] = ["1", "X", "2"];

interface Props {
  match: Match;
  prediction: Sign | null;
  onPredict: (matchId: string, sign: Sign) => void;
}

export default function MatchCard({ match, prediction, onPredict }: Props) {
  const isFinished = match.result !== null;

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{match.homeTeam}</span>
        {match.score && <span className="text-xs text-slate-400 font-mono">{match.score}</span>}
        <span className="font-medium text-sm text-right">{match.awayTeam}</span>
      </div>
      <div className="flex gap-2 justify-center">
        {signs.map((sign) => {
          const isSelected = prediction === sign;
          const isCorrect = isFinished && prediction === sign && match.result === sign;
          const isWrong = isFinished && prediction === sign && match.result !== sign;
          let btnClass = "flex-1 py-2 rounded-lg font-bold text-sm transition-colors ";
          if (isCorrect) btnClass += "bg-green-600 text-white";
          else if (isWrong) btnClass += "bg-red-600 text-white";
          else if (isSelected) btnClass += "bg-blue-600 text-white";
          else btnClass += "bg-slate-700 text-slate-300 hover:bg-slate-600";
          return (
            <button key={sign} disabled={match.locked} onClick={() => onPredict(match.id, sign)} className={btnClass}>
              {sign}
            </button>
          );
        })}
      </div>
      {!match.locked && (
        <p className="text-xs text-slate-500 text-center">
          {match.kickoff.toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
