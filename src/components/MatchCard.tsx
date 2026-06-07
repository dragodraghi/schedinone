import Flag from "./Flag";
import { getMatchStatus } from "../lib/matchStatus";
import { vibrate } from "../lib/haptic";
import type { Match, Sign } from "../lib/types";

const signs: Sign[] = ["1", "X", "2"];

interface Props {
  match: Match;
  prediction: Sign | null;
  onPredict: (matchId: string, sign: Sign | null) => void;
  disabled?: boolean;
}

function formatKickoff(date: Date): string {
  return date.toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchCard({ match, prediction, onPredict, disabled }: Props) {
  const isFinished = match.result !== null;
  const status = getMatchStatus(match);

  return (
    <div className="match-row glass rounded-lg px-3 py-3 space-y-3 relative">
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

      <div className="flex items-center justify-between gap-2">
        <span className="micro-label">{match.group ? `Gruppo ${match.group}` : match.phase}</span>
        <div className="flex items-center gap-2">
          {prediction && !disabled && !match.locked && (
            <button
              type="button"
              onClick={() => {
                vibrate("tap");
                onPredict(match.id, null);
              }}
              aria-label={`Cancella pronostico ${prediction} per ${match.homeTeam} contro ${match.awayTeam}`}
              className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                color: "var(--wrong)",
                background: "rgba(255,51,102,0.10)",
                border: "1px solid rgba(255,51,102,0.28)",
              }}
            >
              Cancella
            </button>
          )}
          <span className="text-[10px] font-bold" style={{ color: "var(--text-soft)", fontFamily: "Outfit, sans-serif" }}>
            {formatKickoff(match.kickoff)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <span
          className="flex items-center gap-2 min-w-0"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}
        >
          <Flag team={match.homeTeam} size={18} />
          <span className="truncate">{match.homeTeam}</span>
        </span>
        <span
          className="px-2 py-1 rounded text-[10px] font-black shrink-0"
          style={{
            color: match.score ? "var(--text-primary)" : "var(--text-muted)",
            background: "rgba(255,255,255,0.05)",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {match.score ?? "VS"}
        </span>
        <span
          className="flex items-center gap-2 min-w-0 justify-end text-right"
          style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}
        >
          <span className="truncate">{match.awayTeam}</span>
          <Flag team={match.awayTeam} size={18} />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {signs.map((sign) => {
          const isSelected = prediction === sign;
          const isCorrect = isFinished && prediction === sign && match.result === sign;
          const isWrong = isFinished && prediction === sign && match.result !== sign;

          let classes = "sign-btn min-h-[42px] rounded-lg text-sm ";
          if (isCorrect) classes += "correct bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50";
          else if (isWrong) classes += "wrong bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/50";
          else if (isSelected) classes += "selected bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50";
          else classes += "bg-white/5 text-[#94a3b8] border border-white/10 hover:bg-white/10 hover:text-white";

          return (
            <button
              key={sign}
              disabled={match.locked || disabled}
              onClick={() => {
                vibrate("tap");
                onPredict(match.id, sign);
              }}
              className={classes}
              title={
                isSelected
                  ? `Pronostico ${sign} selezionato per ${match.homeTeam} contro ${match.awayTeam}`
                  : `Pronostico ${sign} per ${match.homeTeam} contro ${match.awayTeam}`
              }
              aria-pressed={isSelected}
            >
              {sign}
            </button>
          );
        })}
      </div>
    </div>
  );
}
