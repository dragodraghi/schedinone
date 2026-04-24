import Flag from "./Flag";
import { getMatchStatus } from "../lib/matchStatus";
import { vibrate } from "../lib/haptic";
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
  const status = getMatchStatus(match);

  return (
    <div className="match-row glass rounded-lg px-3 py-2.5 space-y-2 relative">
      {status === "live" && (
        <span
          className="live-badge absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider"
          style={{
            fontFamily: "Outfit, sans-serif",
            background: "var(--wrong)",
            color: "white",
            letterSpacing: "0.1em",
          }}
          aria-label="Partita in corso"
        >
          LIVE
        </span>
      )}

      {/* Teams row */}
      <div className="flex items-center gap-1.5 text-xs">
        <span
          className="flex items-center gap-1.5 flex-1 min-w-0"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600 }}
        >
          <Flag team={match.homeTeam} size={14} />
          <span className="truncate">{match.homeTeam}</span>
        </span>
        <span
          className="font-mono text-[10px] px-1 shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {match.score ?? "vs"}
        </span>
        <span
          className="flex items-center gap-1.5 flex-1 min-w-0 justify-end"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600 }}
        >
          <span className="truncate text-right">{match.awayTeam}</span>
          <Flag team={match.awayTeam} size={14} />
        </span>
      </div>

      {/* Buttons row */}
      <div className="flex gap-1.5">
        {signs.map((sign) => {
          const isSelected = prediction === sign;
          const isCorrect = isFinished && prediction === sign && match.result === sign;
          const isWrong = isFinished && prediction === sign && match.result !== sign;

          let classes = "sign-btn flex-1 min-h-[40px] rounded-lg text-xs ";
          if (isCorrect) classes += "correct bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50";
          else if (isWrong) classes += "wrong bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/50";
          else if (isSelected) classes += "selected bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50";
          else classes += "bg-white/5 text-[#64748b] border border-white/10 hover:bg-white/10 hover:text-white";

          return (
            <button
              key={sign}
              disabled={match.locked || disabled || isFinished}
              onClick={() => {
                vibrate("tap");
                onPredict(match.id, sign);
              }}
              className={classes}
            >
              {sign}
            </button>
          );
        })}
      </div>
    </div>
  );
}
