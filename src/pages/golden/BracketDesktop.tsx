import type { CSSProperties } from "react";
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
const gridColumns = "1.35fr 1fr 0.86fr 0.72fr 0.62fr";
const leafSpanByPhase: Record<Phase, number> = {
  gironi: 1,
  sedicesimi: 1,
  ottavi: 2,
  quarti: 4,
  semifinali: 8,
  finale: 16,
};

function nodeGridRow(phase: Phase, index: number): string {
  const leafSpan = leafSpanByPhase[phase];
  return `${index * leafSpan * 2 + leafSpan} / span 2`;
}

function TeamButton({
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
      className="min-h-[42px] w-full rounded-md border px-2 py-2 text-left text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        fontFamily: "Outfit, sans-serif",
        color: selected ? "var(--ink)" : placeholder ? "var(--text-muted)" : "var(--text-primary)",
        background: selected
          ? "linear-gradient(135deg, #ffd700, #2dd481)"
          : "rgba(255,255,255,0.055)",
        borderColor: selected ? "rgba(255,215,0,0.64)" : "var(--border)",
      }}
    >
      <span className="block truncate">{team}</span>
    </button>
  );
}

function MatchNode({
  match,
  prediction,
  disabled,
  onPick,
  style,
}: {
  match: Match;
  prediction: QualifierSign | undefined;
  disabled: boolean;
  onPick: (matchId: string, sign: QualifierSign | null) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      data-testid={`bracket-node-${match.id}`}
      className="h-full rounded-lg border border-[var(--border)] bg-white/[0.035] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
      style={style}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="micro-label truncate">{match.bracketSlot ?? match.id}</span>
        {prediction && (
          <span className="rounded bg-[rgba(255,215,0,0.12)] px-1.5 py-0.5 text-[9px] font-black text-[var(--gold)]">
            OK
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TeamButton
          match={match}
          sign="1"
          team={match.homeTeam}
          selected={prediction === "1"}
          disabled={disabled}
          onPick={onPick}
        />
        <TeamButton
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
}

export default function BracketDesktop({ matches, predictions, onPick, disabled }: Props) {
  const sorted = sortBracketMatches(matches);

  return (
    <section className="space-y-3" aria-label="Vista tabellone Golden Plus">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--gold)]">
          Vista tabellone
        </h2>
        <span className="text-[10px] font-bold text-[var(--text-muted)]">
          Seleziona la squadra che passa il turno
        </span>
      </div>

      <div className="min-w-[1080px] pb-2">
        <div
          className="sticky top-0 z-[1] grid gap-3 pb-2"
          style={{ gridTemplateColumns: gridColumns } as CSSProperties}
        >
          {bracketPhases.map((phase) => (
            <div
              key={phase}
              className="rounded-md border border-[var(--border)] bg-[rgba(4,8,16,0.88)] px-2 py-2 backdrop-blur"
            >
              <p className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">
                {phaseLabels[phase]}
              </p>
            </div>
          ))}
        </div>

        <div
          className="grid gap-x-3"
          style={{
            gridTemplateColumns: gridColumns,
            gridTemplateRows: "repeat(32, 58px)",
          } as CSSProperties}
        >
          {bracketPhases.flatMap((phase, phaseIndex) =>
            sorted
              .filter((match) => match.phase === phase)
              .map((match, matchIndex) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id]}
                  disabled={disabled}
                  onPick={onPick}
                  style={{
                    gridColumn: phaseIndex + 1,
                    gridRow: nodeGridRow(phase, matchIndex),
                  }}
                />
              ))
          )}
        </div>
      </div>
    </section>
  );
}
