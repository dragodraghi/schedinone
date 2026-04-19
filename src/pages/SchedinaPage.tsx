import { useState, useEffect, useCallback, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { vibrate } from "../lib/haptic";
import MatchCard from "../components/MatchCard";
import Toast, { type ToastData } from "../components/Toast";
import EmptyState from "../components/EmptyState";
import Confetti from "../components/Confetti";
import type { Game, Match, Player, Sign } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  matches: Match[];
  gameId: string;
}

export default function SchedinaPage({ game, player, matches, gameId }: Props) {
  const [predictions, setPredictions] = useState<Record<string, Sign>>(player.predictions);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [topScorerPick, setTopScorerPick] = useState(player.topScorerPick || "");
  const [winnerPick, setWinnerPick] = useState(player.winnerPick || "");
  const [localStatus, setLocalStatus] = useState(player.scheduleStatus);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const prevStatusRef = useRef(player.scheduleStatus);
  const hydratedRef = useRef(false);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setPredictions(player.predictions);
    setTopScorerPick(player.topScorerPick || "");
    setWinnerPick(player.winnerPick || "");
    setLocalStatus(player.scheduleStatus);
  }, [player.predictions, player.topScorerPick, player.winnerPick, player.scheduleStatus]);

  // Celebrate when the Comitato accepts the schedina
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== "accettata" && player.scheduleStatus === "accettata") {
      setCelebrate(true);
      vibrate("success");
      const t = setTimeout(() => setCelebrate(false), 4000);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = player.scheduleStatus;
  }, [player.scheduleStatus]);

  const status = localStatus;
  const isReadOnly = status === "inviata" || status === "accettata";
  const isRifiutata = status === "rifiutata";
  const isEditable = !isReadOnly;

  // Auto-save draft — debounced, only while the schedina is still editable (bozza or rifiutata)
  useEffect(() => {
    // Skip the very first render (mount / re-hydration from player prop)
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    if (!isEditable) return;

    const handle = setTimeout(async () => {
      try {
        setAutoSaving(true);
        const ref = doc(db, "games", gameId, "players", player.id);
        // If the Comitato rifiutata the schedina, keep that status — we only
        // want to save the edits so the player can re-submit manually.
        // Writing "bozza" here would overwrite the rejection (and the Firestore
        // rule forbids some transitions, silently failing).
        const updates: Record<string, unknown> = {
          predictions,
          topScorerPick,
          winnerPick,
        };
        if (status === "bozza") {
          updates.scheduleStatus = "bozza";
        }
        await updateDoc(ref, updates);
        setDraftSaved(true);
        // Fade the "Salvato" pill out after ~2s
        setTimeout(() => setDraftSaved(false), 2000);
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 800);

    return () => clearTimeout(handle);
  }, [predictions, topScorerPick, winnerPick, isEditable, status, gameId, player.id]);

  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);

  const groups = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group ?? m.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const handlePredict = (matchId: string, sign: Sign) => {
    if (isReadOnly) return;
    setPredictions((prev) => ({ ...prev, [matchId]: sign }));
  };

  const handleSave = async () => {
    setSaving(true);
    vibrate("success");
    try {
      const ref = doc(db, "games", gameId, "players", player.id);
      await updateDoc(ref, {
        predictions,
        topScorerPick,
        winnerPick,
        scheduleStatus: "inviata",
      });
      setLocalStatus("inviata");
      setToast({ message: "Schedina inviata al Comitato!", type: "info" });
    } catch (err) {
      console.error("Save error:", err);
      vibrate("error");
      setToast({ message: "Errore nell'invio. Riprova.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = phaseMatches.filter((m) => predictions[m.id]).length;
  const allFilled = filledCount === phaseMatches.length && topScorerPick && winnerPick;

  return (
    <div className="space-y-4 animate-in">
      <Confetti active={celebrate} />
      <Toast toast={toast} onDone={clearToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>Schedina</h1>
          <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
            Fase: {game.currentPhase}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (autoSaving || draftSaved) && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full transition-opacity duration-300"
              style={{
                fontFamily: "Outfit, sans-serif",
                color: autoSaving ? "var(--text-muted)" : "var(--correct)",
                background: autoSaving ? "rgba(100,116,139,0.1)" : "rgba(0,255,136,0.1)",
                border: `1px solid ${autoSaving ? "var(--border)" : "rgba(0,255,136,0.3)"}`,
              }}
              aria-live="polite"
            >
              {autoSaving ? "Salvataggio..." : "\u2713 Salvato"}
            </span>
          )}
          <div className="counter-pill px-3 py-1.5 rounded-full text-xs">
            <span style={{ color: filledCount === phaseMatches.length ? "var(--correct)" : "var(--accent)" }}>{filledCount}</span>
            <span style={{ color: "var(--text-muted)" }}>/{phaseMatches.length}</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {status === "inviata" && (
        <div
          className="glass rounded-xl px-4 py-3 animate-in"
          style={{
            background: "rgba(0, 212, 255, 0.08)",
            border: "1px solid rgba(0,212,255,0.35)",
            boxShadow: "0 0 20px rgba(0,212,255,0.08)",
          }}
        >
          <p className="font-black text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "var(--accent)" }}>
            📬 Schedina inviata!
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            In attesa di conferma del Comitato.
          </p>
        </div>
      )}

      {status === "accettata" && (
        <div
          className="glass rounded-xl px-4 py-3 animate-in"
          style={{
            background: "rgba(0, 255, 136, 0.08)",
            border: "1px solid rgba(0,255,136,0.35)",
            boxShadow: "0 0 20px rgba(0,255,136,0.08)",
          }}
        >
          <p className="font-black text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "var(--correct)" }}>
            ✅ Schedina accettata!
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Il Comitato ha accettato la tua schedina.
          </p>
        </div>
      )}

      {isRifiutata && (
        <div
          className="glass rounded-xl px-4 py-3 animate-in"
          style={{
            background: "rgba(255, 51, 102, 0.08)",
            border: "1px solid rgba(255,51,102,0.35)",
            boxShadow: "0 0 20px rgba(255,51,102,0.08)",
          }}
        >
          <p className="font-black text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "var(--wrong)" }}>
            ⚠️ Schedina rifiutata
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Il Comitato ha rifiutato la tua schedina. Puoi modificarla e reinviarla.
          </p>
        </div>
      )}

      {/* Groups grid */}
      {phaseMatches.length === 0 && (
        <EmptyState
          icon="📋"
          title="Ancora nessuna partita"
          description={`Il Comitato non ha ancora inserito le partite per la fase "${game.currentPhase}". Torna più tardi!`}
          accent="muted"
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groups).map(([groupName, groupMatches], i) => (
          <div
            key={groupName}
            className="space-y-1.5 animate-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <h2 className="group-header sticky-group text-[11px] uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {game.currentPhase === "gironi" ? `Gruppo ${groupName}` : groupName}
            </h2>
            {groupMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id] ?? null}
                onPredict={isReadOnly ? () => {} : handlePredict}
                disabled={isReadOnly}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Special picks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass rounded-lg px-3 py-2.5">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gold)", fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>Capocannoniere</label>
          <input
            type="text"
            value={topScorerPick}
            onChange={(e) => { if (!isReadOnly) setTopScorerPick(e.target.value); }}
            placeholder="Nome giocatore"
            maxLength={40}
            disabled={isReadOnly}
            className="w-full mt-1 px-2 py-1.5 bg-white/5 border rounded text-sm text-white placeholder-[#475569] focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderColor: topScorerPick ? "rgba(255, 215, 0, 0.3)" : "var(--border)" }}
          />
        </div>
        <div className="glass rounded-lg px-3 py-2.5">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gold)", fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>Vincitrice Mondiale</label>
          <input
            type="text"
            value={winnerPick}
            onChange={(e) => { if (!isReadOnly) setWinnerPick(e.target.value); }}
            placeholder="Nome squadra"
            maxLength={40}
            disabled={isReadOnly}
            className="w-full mt-1 px-2 py-1.5 bg-white/5 border rounded text-sm text-white placeholder-[#475569] focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderColor: winnerPick ? "rgba(255, 215, 0, 0.3)" : "var(--border)" }}
          />
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(4, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-4 animate-in"
            style={{ border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 0 40px rgba(0,212,255,0.1)' }}
          >
            <h2 className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              Conferma invio
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sei sicuro? Dopo l'invio non potrai modificare la schedina.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm glass transition-all"
                style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)' }}
              >
                Annulla
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); handleSave(); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                  color: '#040810',
                  boxShadow: '0 0 20px rgba(0,212,255,0.2)',
                }}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save button — hidden when read-only. Disabled until ALL predictions
          + capocannoniere + vincitrice are filled, to avoid sending a
          half-complete schedina that locks the player out. */}
      {!isReadOnly && (
        <>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={saving || !allFilled}
            className={`btn-glow w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 ${allFilled && !saving ? "pulse-ring" : ""}`}
            style={{
              fontFamily: "Outfit, sans-serif",
              background: allFilled
                ? "linear-gradient(135deg, #00d4ff, #0099cc)"
                : "rgba(255,255,255,0.05)",
              color: allFilled ? "#040810" : "var(--text-muted)",
              boxShadow: allFilled ? "0 0 30px rgba(0, 212, 255, 0.15)" : "none",
              border: allFilled ? "none" : "1px solid var(--border)",
              opacity: saving ? 0.6 : 1,
              cursor: allFilled ? "pointer" : "not-allowed",
            }}
          >
            {saving
              ? "Invio in corso..."
              : allFilled
              ? "SALVA E INVIA AL COMITATO"
              : `Mancano ${phaseMatches.length - filledCount} pronostic${phaseMatches.length - filledCount === 1 ? "o" : "i"}${!topScorerPick ? " + capocannoniere" : ""}${!winnerPick ? " + vincitrice" : ""}`}
          </button>
        </>
      )}

      <p className="text-[10px] text-center pb-2" style={{ color: "var(--text-muted)" }}>
        {(() => {
          // Find the earliest kickoff in the current phase — that's when the
          // schedina effectively closes (24h before).
          const firstMatch = phaseMatches
            .filter((m) => m.kickoff)
            .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())[0];
          if (!firstMatch) return "I pronostici si chiudono 1 giorno prima del calcio d'inizio";
          const closeAt = new Date(firstMatch.kickoff.getTime() - 24 * 60 * 60 * 1000);
          return `La schedina si chiude ${closeAt.toLocaleString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}`;
        })()}
      </p>
    </div>
  );
}
