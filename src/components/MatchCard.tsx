import type { Match, Sign } from "../lib/types";
import { getFlag } from "../lib/flags";

const signs: Sign[] = ["1", "X", "2"];

interface Props {
  match: Match;
  prediction: Sign | null;
  onPredict: (matchId: string, sign: Sign) => void;
}

export default function MatchCard({ match, prediction, onPredict }: Props) {
  const isFinished = match.result !== null;

  return (
    <div className="match-row glass rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>{getFlag(match.homeTeam)} {match.homeTeam}</span>
          {match.score && <span className="font-mono mx-1" style={{ color: 'var(--accent)' }}>{match.score}</span>}
          <span className="font-medium truncate text-right" style={{ fontFamily: 'Outfit, sans-serif' }}>{match.awayTeam} {getFlag(match.awayTeam)}</span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {signs.map((sign) => {
          const isSelected = prediction === sign;
          const isCorrect = isFinished && prediction === sign && match.result === sign;
          const isWrong = isFinished && prediction === sign && match.result !== sign;

          let classes = "sign-btn w-8 h-8 rounded text-xs ";
          if (isCorrect) classes += "correct bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50";
          else if (isWrong) classes += "wrong bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/50";
          else if (isSelected) classes += "selected bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50";
          else classes += "bg-white/5 text-[#64748b] border border-white/10 hover:bg-white/10 hover:text-white";

          return (
            <button key={sign} disabled={match.locked} onClick={() => onPredict(match.id, sign)} className={classes}>
              {sign}
            </button>
          );
        })}
      </div>
    </div>
  );
}
