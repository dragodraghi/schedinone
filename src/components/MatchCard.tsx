import { getFlag } from "../lib/flags";
import type { Match, Sign } from "../lib/types";

const signs: Sign[] = ["1", "X", "2"];

interface Props {
  match: Match;
  prediction: Sign | null;
  onPredict: (matchId: string, sign: Sign) => void;
  disabled?: boolean;
}

export default function MatchCard({ match, prediction, onPredict, disabled }: Props) {
  const isFinished = match.result !== null;

  return (
    <div className="match-row glass rounded-lg px-3 py-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium truncate flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="text-sm shrink-0">{getFlag(match.homeTeam)}</span>
            {match.homeTeam}
          </span>
          <span className="font-mono mx-1.5 text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
            {match.score ?? "vs"}
          </span>
          <span className="font-medium truncate text-right flex items-center gap-1.5 justify-end" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {match.awayTeam}
            <span className="text-sm shrink-0">{getFlag(match.awayTeam)}</span>
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {signs.map((sign) => {
          const isSelected = prediction === sign;
          const isCorrect = isFinished && prediction === sign && match.result === sign;
          const isWrong = isFinished && prediction === sign && match.result !== sign;

          let classes = "sign-btn min-w-[44px] min-h-[44px] rounded-lg text-xs ";
          if (isCorrect) classes += "correct bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50";
          else if (isWrong) classes += "wrong bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/50";
          else if (isSelected) classes += "selected bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50";
          else classes += "bg-white/5 text-[#64748b] border border-white/10 hover:bg-white/10 hover:text-white";

          return (
            <button key={sign} disabled={match.locked || disabled} onClick={() => onPredict(match.id, sign)} className={classes}>
              {sign}
            </button>
          );
        })}
      </div>
    </div>
  );
}
