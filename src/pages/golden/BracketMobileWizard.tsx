import {
  isPlaceholderTeam,
  sortBracketMatches,
  type QualifierPredictions,
} from "../../lib/bracket";
import type { Match, Phase, QualifierSign } from "../../lib/types";

type Props = {
  matches: Match[];
  predictions: QualifierPredictions;
  onPick: (matchId: string, sign: QualifierSign | null) => void;
  disabled: boolean;
};

const phaseLabels: Record<Phase, string> = {
  gironi: "Gironi",
  sedicesimi: "Sedicesimi",
  ottavi: "Ottavi",
  quarti: "Quarti",
  semifinali: "Semifinali",
  finale: "Finale",
};

const bracketPhases: Phase[] = ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"];

function ChoiceButton({
  match,
  sign,
  team,
  selected,
  disabled,
  onPick,
}: {
  match: Match;
  sign: QualifierSign;
  team: string;
  selected: boolean;
  disabled: boolean;
  onPick: (matchId: string, sign: QualifierSign | null) => void;
}) {
  const placeholder = isPlaceholderTeam(team);
  const buttonDisabled = disabled || placeholder;

  return (
    <button
      type="button"
      disabled={buttonDisabled}
      aria-pressed={selected}
      aria-label={`Scegli ${team} per ${match.id}`}
      onClick={() => onPick(match.id, selected ? null : sign)}
      className="min-h-[46px] w-full rounded-lg border px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        fontFamily: "Outfit, sans-serif",
        color: selected ? "var(--ink)" : placeholder ? "var(--text-muted)" : "var(--text-primary)",
        background: selected ? "linear-gradient(135deg, #ffd700, #2dd481)" : "rgba(255,255,255,0.055)",
        borderColor: selected ? "rgba(255,215,0,0.64)" : "var(--border)",
      }}
    >
      <span className="block truncate text-sm font-black">{team}</span>
    </button>
  );
}

export default function BracketMobileWizard({ matches, predictions, onPick, disabled }: Props) {
  const sorted = sortBracketMatches(matches);

  return (
    <section className="space-y-4" aria-label="Quadrante guidato Golden Plus">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--gold)]">
          Quadrante guidato
        </h2>
        <span className="text-[10px] font-bold text-[var(--text-muted)]">
          Team name
        </span>
      </div>

      {bracketPhases.map((phase) => {
        const phaseMatches = sorted.filter((match) => match.phase === phase);
        if (phaseMatches.length === 0) return null;

        return (
          <div key={phase} className="space-y-2">
            <h3 className="group-header text-[11px] uppercase tracking-wider text-[var(--pitch)]">
              {phaseLabels[phase]}
            </h3>
            {phaseMatches.map((match) => {
              const prediction = predictions[match.id];
              return (
                <div
                  key={match.id}
                  className="rounded-lg border border-[var(--border)] bg-white/[0.035] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="micro-label">{match.bracketSlot ?? match.id}</span>
                    {prediction && (
                      <span className="rounded bg-[rgba(255,215,0,0.12)] px-1.5 py-0.5 text-[9px] font-black text-[var(--gold)]">
                        Scelta fatta
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <ChoiceButton
                      match={match}
                      sign="1"
                      team={match.homeTeam}
                      selected={prediction === "1"}
                      disabled={disabled}
                      onPick={onPick}
                    />
                    <ChoiceButton
                      match={match}
                      sign="2"
                      team={match.awayTeam}
                      selected={prediction === "2"}
                      disabled={disabled}
                      onPick={onPick}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
