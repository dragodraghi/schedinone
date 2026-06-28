import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Toast, { type ToastData } from "../../components/Toast";
import { vibrate } from "../../lib/haptic";
import { saveSchedule } from "../../lib/schedule";
import { isMatchClosedForPredictions } from "../../lib/scheduleRules";
import {
  applyBracketPredictions,
  qualifierPredictionsFromPlayer,
  withBracketPick,
  type QualifierPredictions,
} from "../../lib/bracket";
import type { Game, Match, Player, QualifierSign } from "../../lib/types";
import BracketDesktop from "./BracketDesktop";
import BracketMobileWizard from "./BracketMobileWizard";

type Props = {
  game: Game;
  player: Player;
  matches: Match[];
  gameId: string;
};

export default function GoldenBracketPage({ game, player, matches, gameId }: Props) {
  const [predictions, setPredictions] = useState<QualifierPredictions>(() =>
    qualifierPredictionsFromPlayer(player.predictions)
  );
  const [localStatus, setLocalStatus] = useState(player.scheduleStatus);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    setPredictions(qualifierPredictionsFromPlayer(player.predictions));
    setLocalStatus(player.scheduleStatus);
  }, [player.predictions, player.scheduleStatus]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const clearToast = useCallback(() => setToast(null), []);
  const derivedMatches = useMemo(
    () => applyBracketPredictions(matches, predictions),
    [matches, predictions]
  );
  const isReadOnly = localStatus === "inviata" || localStatus === "accettata";
  const filledCount = matches.filter((match) => predictions[match.id]).length;
  const allFilled = matches.length > 0 && filledCount === matches.length;
  const missingCount = Math.max(matches.length - filledCount, 0);

  const persistDraft = useCallback(
    async (nextPredictions: QualifierPredictions, submit: boolean) => {
      setSaving(true);
      try {
        const result = await saveSchedule({
          gameId,
          predictions: nextPredictions,
          topScorerPick: "",
          winnerPick: "",
          submit,
        });
        setLocalStatus(result.scheduleStatus);
        setToast({
          type: submit ? "info" : "success",
          message: submit ? "Tabellone inviato al Comitato." : "Bozza Golden salvata.",
        });
      } catch (err) {
        console.error("Golden schedule save error:", err);
        const message =
          err && typeof err === "object" && "message" in err && typeof err.message === "string"
            ? err.message
            : "Salvataggio Golden non riuscito.";
        setToast({ type: "error", message });
        vibrate("error");
      } finally {
        setSaving(false);
      }
    },
    [gameId]
  );

  const handlePick = (matchId: string, sign: QualifierSign | null) => {
    if (isReadOnly || saving) return;
    const match = matches.find((item) => item.id === matchId);
    if (!match || isMatchClosedForPredictions(game, match)) return;

    const nextPredictions = withBracketPick(matches, predictions, matchId, sign);
    setPredictions(nextPredictions);
    vibrate("tap");
    void persistDraft(nextPredictions, false);
  };

  const handleSubmit = () => {
    if (!allFilled || isReadOnly || saving) return;
    vibrate("success");
    void persistDraft(predictions, true);
  };

  return (
    <div className="space-y-5 animate-in">
      <Toast toast={toast} onDone={clearToast} />

      <div className="page-head">
        <div>
          <p className="page-kicker">Golden Plus</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Tabellone Golden Plus</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Pronostico a qualificata: scegli la squadra che passa, l'app la porta avanti.
          </p>
        </div>
        <div className="counter-pill shrink-0 rounded-full px-3 py-1.5 text-xs">
          <span style={{ color: allFilled ? "var(--correct)" : "var(--accent)" }}>{filledCount}</span>
          <span style={{ color: "var(--text-muted)" }}>/{matches.length}</span>
        </div>
      </div>

      <Link
        to="/golden-plus/classifica"
        className="secondary-action flex items-center justify-center px-4"
        style={{ borderColor: "rgba(255,215,0,0.32)", color: "var(--gold)" }}
      >
        Classifica Golden
      </Link>

      {!isReadOnly && matches.length > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allFilled || saving}
          className="primary-action sticky top-2 z-20 w-full px-4 py-3 text-center disabled:opacity-55"
        >
          <span className="block text-sm font-black uppercase tracking-wider">
            {saving ? "Salvataggio..." : "Invia tabellone al Comitato"}
          </span>
          {!saving && !allFilled && (
            <span className="mt-0.5 block text-[11px] font-bold normal-case tracking-normal opacity-80">
              Mancano {missingCount} scelt{missingCount === 1 ? "a" : "e"}
            </span>
          )}
        </button>
      )}

      {isReadOnly && (
        <div className="status-panel px-4 py-3">
          <p className="text-sm font-black text-[var(--accent)]">Tabellone inviato</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            In attesa della gestione Comitato.
          </p>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="surface-panel p-4 text-sm text-[var(--text-muted)]">
          Il Comitato non ha ancora configurato il tabellone Golden Plus.
        </div>
      ) : (
        <div
          data-testid="golden-bracket-scroll"
          className="golden-bracket-scroll surface-panel max-w-full overflow-x-auto p-3 sm:p-4"
        >
          {isMobile ? (
            <BracketMobileWizard
              matches={derivedMatches}
              predictions={predictions}
              onPick={handlePick}
              disabled={isReadOnly || saving}
            />
          ) : (
            <BracketDesktop
              matches={derivedMatches}
              predictions={predictions}
              onPick={handlePick}
              disabled={isReadOnly || saving}
            />
          )}
        </div>
      )}

    </div>
  );
}
