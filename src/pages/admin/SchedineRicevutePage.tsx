import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Toast, { type ToastData } from "../../components/Toast";
import {
  applyBracketPredictions,
  qualifierPredictionsFromPlayer,
  selectedTeam,
  sortBracketMatches,
} from "../../lib/bracket";
import type { Game, Player, Match, ScheduleStatus } from "../../lib/types";

interface Props {
  players: Player[];
  matches: Match[];
  gameId: string;
  game: Game;
  title?: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
}

type FilterTab = "Tutte" | "In attesa" | "Accettate" | "Rifiutate";

function phaseLabel(phase: Match["phase"]): string {
  switch (phase) {
    case "sedicesimi":
      return "Sedicesimi";
    case "ottavi":
      return "Ottavi";
    case "quarti":
      return "Quarti";
    case "semifinali":
      return "Semifinali";
    case "finale":
      return "Finale";
    default:
      return "Gironi";
  }
}

function statusLabel(status: ScheduleStatus): string {
  switch (status) {
    case "inviata":
      return "In attesa";
    case "accettata":
      return "Accettata";
    case "rifiutata":
      return "Rifiutata";
    default:
      return "Bozza";
  }
}

function statusColor(status: ScheduleStatus): string {
  switch (status) {
    case "inviata":
      return "var(--accent)";
    case "accettata":
      return "var(--correct)";
    case "rifiutata":
      return "var(--wrong)";
    default:
      return "var(--text-muted)";
  }
}

function statusBg(status: ScheduleStatus): string {
  switch (status) {
    case "inviata":
      return "rgba(0, 212, 255, 0.12)";
    case "accettata":
      return "rgba(0, 255, 136, 0.12)";
    case "rifiutata":
      return "rgba(255, 51, 102, 0.12)";
    default:
      return "rgba(255,255,255,0.05)";
  }
}

function statusBorder(status: ScheduleStatus): string {
  switch (status) {
    case "inviata":
      return "rgba(0, 212, 255, 0.35)";
    case "accettata":
      return "rgba(0, 255, 136, 0.35)";
    case "rifiutata":
      return "rgba(255, 51, 102, 0.35)";
    default:
      return "var(--border)";
  }
}

export default function SchedineRicevutePage({
  players,
  matches,
  gameId,
  game,
  title,
  subtitle,
  backTo = "/admin",
  backLabel = "Admin",
}: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("Tutte");
  const [updating, setUpdating] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showAcceptAllConfirm, setShowAcceptAllConfirm] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const isGolden = game.mode === "golden-plus" || game.predictionMode === "qualifier";
  const relevantMatches = isGolden ? matches : matches.filter((m) => m.phase === game.currentPhase);
  const totalMatches = relevantMatches.length;
  const showSpecialPicks = game.specialPicksEnabled !== false && !isGolden;
  const pageTitle = title ?? (isGolden ? "Schedine Golden" : "Schedine Ricevute");

  const submitted = players.filter((p) => p.scheduleStatus !== "bozza");

  const filtered = submitted.filter((p) => {
    if (activeTab === "Tutte") return true;
    if (activeTab === "In attesa") return p.scheduleStatus === "inviata";
    if (activeTab === "Accettate") return p.scheduleStatus === "accettata";
    if (activeTab === "Rifiutate") return p.scheduleStatus === "rifiutata";
    return true;
  });

  const tabCounts: Record<FilterTab, number> = {
    Tutte: submitted.length,
    "In attesa": submitted.filter((p) => p.scheduleStatus === "inviata").length,
    Accettate: submitted.filter((p) => p.scheduleStatus === "accettata").length,
    Rifiutate: submitted.filter((p) => p.scheduleStatus === "rifiutata").length,
  };

  const tabs: FilterTab[] = ["Tutte", "In attesa", "Accettate", "Rifiutate"];

  const updateStatus = async (playerId: string, status: ScheduleStatus) => {
    setUpdating(playerId + status);
    try {
      const ref = doc(db, "games", gameId, "players", playerId);
      await updateDoc(ref, { scheduleStatus: status });
    } catch (err) {
      console.error("Update status error:", err);
    } finally {
      setUpdating(null);
    }
  };

  const pendingPlayers = submitted.filter((p) => p.scheduleStatus === "inviata");
  const unpaidPendingCount = pendingPlayers.filter((p) => !p.paid).length;

  const acceptAll = async () => {
    if (pendingPlayers.length === 0) return;
    const count = pendingPlayers.length;
    setAcceptingAll(true);
    try {
      let batch = writeBatch(db);
      let pendingWrites = 0;
      const commitPending = async () => {
        if (pendingWrites === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        pendingWrites = 0;
      };
      for (const p of pendingPlayers) {
        const ref = doc(db, "games", gameId, "players", p.id);
        batch.update(ref, { scheduleStatus: "accettata" });
        pendingWrites++;
        if (pendingWrites >= 400) {
          await commitPending();
        }
      }
      await commitPending();
      setToast({
        message: `${count} schedin${count === 1 ? "a accettata" : "e accettate"}`,
        type: "success",
      });
    } catch (err) {
      console.error("Accept all error:", err);
      setToast({ message: "Errore nell'accettazione. Riprova.", type: "error" });
    } finally {
      setAcceptingAll(false);
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <Toast toast={toast} onDone={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            {pageTitle}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle ?? `${submitted.length} inviate · ${players.length} totali`}
          </p>
        </div>
        <Link
          to={backTo}
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass"
          style={{ color: "var(--text-muted)" }}
        >
          ← {backLabel}
        </Link>
      </div>

      {pendingPlayers.length > 0 && (
        <button
          onClick={() => setShowAcceptAllConfirm(true)}
          disabled={acceptingAll}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
          style={{
            fontFamily: "Outfit, sans-serif",
            background: "rgba(0,255,136,0.15)",
            color: "var(--correct)",
            border: "1px solid rgba(0,255,136,0.4)",
            opacity: acceptingAll ? 0.6 : 1,
            boxShadow: "0 0 16px rgba(0,255,136,0.1)",
          }}
        >
          {acceptingAll ? "Accettando..." : `✓ Accetta inviate (${pendingPlayers.length})`}
        </button>
      )}

      {unpaidPendingCount > 0 && (
        <div
          className="status-panel px-4 py-3"
          style={{
            "--status-bg": "rgba(255, 215, 0, 0.08)",
            "--status-border": "rgba(255, 215, 0, 0.32)",
          } as CSSProperties}
        >
          <p className="font-black text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}>
            {unpaidPendingCount} schedin{unpaidPendingCount === 1 ? "a" : "e"} in attesa di pagamento
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Puoi accettarle comunque: il pagamento resta separato e rimane visibile come "Da pagare".
          </p>
        </div>
      )}

      {showAcceptAllConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(4, 8, 16, 0.85)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-4 animate-in"
            style={{ border: "1px solid rgba(0,255,136,0.3)", boxShadow: "0 0 40px rgba(0,255,136,0.1)" }}
          >
            <h2 className="text-lg font-black" style={{ fontFamily: "Outfit, sans-serif", color: "var(--correct)" }}>
              ✓ Accettare {pendingPlayers.length} schedin{pendingPlayers.length === 1 ? "a" : "e"} inviat{pendingPlayers.length === 1 ? "a" : "e"}?
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Tutte le schedine in attesa verranno contrassegnate come <strong style={{ color: "var(--correct)" }}>accettate</strong> e i pronostici saranno visibili nel Griglione.
              Se una schedina e' ancora senza bonifico, restera' comunque segnata come <strong style={{ color: "var(--gold)" }}>da pagare</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm glass transition-all"
                style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setShowAcceptAllConfirm(false);
                  acceptAll();
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  background: "linear-gradient(135deg, var(--correct), #00cc6a)",
                  color: "#040810",
                  boxShadow: "0 0 20px rgba(0,255,136,0.25)",
                }}
              >
                Si, accetta inviate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: isActive ? "rgba(0, 212, 255, 0.2)" : "rgba(255,255,255,0.05)",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${isActive ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                boxShadow: isActive ? "0 0 8px rgba(0,212,255,0.25)" : "none",
              }}
            >
              {tab}
              {tabCounts[tab] > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{
                    background: isActive ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.1)",
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {tabCounts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
          <div className="text-3xl mb-2">📭</div>
          <p className="font-bold">Nessuna schedina in questa categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((player) => {
            const filledCount = relevantMatches.filter((m) => player.predictions[m.id]).length;
            const isInviata = player.scheduleStatus === "inviata";
            const acceptKey = player.id + "accettata";
            const rejectKey = player.id + "rifiutata";
            const goldenPredictions = isGolden ? qualifierPredictionsFromPlayer(player.predictions) : {};
            const goldenPredictionMatches = isGolden
              ? sortBracketMatches(applyBracketPredictions(matches, goldenPredictions)).filter(
                  (match) => goldenPredictions[match.id]
                )
              : [];

            return (
              <div
                key={player.id}
                className="glass rounded-xl p-4 space-y-3 animate-in"
                style={{
                  border: `1px solid ${statusBorder(player.scheduleStatus)}`,
                  boxShadow: isInviata ? "0 0 16px rgba(0,212,255,0.08)" : "none",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-black" style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}>
                    {player.name}
                  </p>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{
                      background: statusBg(player.scheduleStatus),
                      color: statusColor(player.scheduleStatus),
                      border: `1px solid ${statusBorder(player.scheduleStatus)}`,
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    {statusLabel(player.scheduleStatus)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                      Pronostici
                    </span>
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: filledCount === totalMatches ? "rgba(0,255,136,0.12)" : "rgba(0,212,255,0.1)",
                        color: filledCount === totalMatches ? "var(--correct)" : "var(--accent)",
                        fontFamily: "Outfit, sans-serif",
                      }}
                    >
                      {filledCount}/{totalMatches}
                    </span>
                  </div>

                  {showSpecialPicks && player.topScorerPick && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                        Capocannoniere
                      </span>
                      <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>
                        {player.topScorerPick}
                      </span>
                    </div>
                  )}

                  {showSpecialPicks && player.winnerPick && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                        Vincitrice
                      </span>
                      <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>
                        {player.winnerPick}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                      Pagamento
                    </span>
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: player.paid ? "rgba(0,255,136,0.12)" : "rgba(255,215,0,0.12)",
                        color: player.paid ? "var(--correct)" : "var(--gold)",
                        border: `1px solid ${player.paid ? "rgba(0,255,136,0.3)" : "rgba(255,215,0,0.3)"}`,
                        fontFamily: "Outfit, sans-serif",
                      }}
                    >
                      {player.paid ? "Pagato" : "Non pagato"}
                    </span>
                  </div>
                </div>

                {isGolden && (
                  <div
                    className="rounded-xl border p-2.5"
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p
                        className="text-xs font-black uppercase tracking-[0.14em]"
                        style={{ color: "var(--gold)", fontFamily: "Outfit, sans-serif" }}
                      >
                        Schedina compilata
                      </p>
                      <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                        {goldenPredictionMatches.length}/{matches.length}
                      </span>
                    </div>

                    {goldenPredictionMatches.length === 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Nessuna scelta salvata.
                      </p>
                    ) : (
                      <div
                        data-testid={`golden-picks-compact-${player.id}`}
                        className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3"
                      >
                        {goldenPredictionMatches.map((match) => {
                          const sign = goldenPredictions[match.id];
                          const winner = selectedTeam(match, sign);
                          return (
                            <div
                              key={match.id}
                              className="grid grid-cols-[minmax(0,1fr)_minmax(78px,auto)] gap-2 rounded-md px-2 py-1.5"
                              style={{
                                background: "rgba(4,8,16,0.34)",
                                border: "1px solid rgba(255,255,255,0.07)",
                              }}
                            >
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                                  {phaseLabel(match.phase)} · {match.bracketSlot ?? match.id}
                                </p>
                                <p className="truncate text-[11px]" style={{ color: "var(--text-soft)" }}>
                                  {match.homeTeam} - {match.awayTeam}
                                </p>
                              </div>
                              <div className="min-w-0 text-right">
                                <p className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                                  Passa
                                </p>
                                <p className="max-w-[118px] truncate text-xs font-black" style={{ color: "var(--correct)" }}>
                                  {winner}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {isInviata && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(player.id, "accettata")}
                      disabled={updating === acceptKey}
                      aria-label={`Accetta schedina ${player.name}`}
                      title="Accetta schedina"
                      className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: "rgba(0,255,136,0.15)",
                        color: "var(--correct)",
                        border: "1px solid rgba(0,255,136,0.4)",
                        opacity: updating === acceptKey ? 0.6 : 1,
                        boxShadow: "0 0 12px rgba(0,255,136,0.1)",
                        cursor: "pointer",
                      }}
                    >
                      {updating === acceptKey ? "..." : "✓ Accetta"}
                    </button>
                    <button
                      onClick={() => updateStatus(player.id, "rifiutata")}
                      disabled={updating === rejectKey}
                      className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: "rgba(255,51,102,0.12)",
                        color: "var(--wrong)",
                        border: "1px solid rgba(255,51,102,0.4)",
                        opacity: updating === rejectKey ? 0.6 : 1,
                        boxShadow: "0 0 12px rgba(255,51,102,0.08)",
                      }}
                    >
                      {updating === rejectKey ? "..." : "✕ Rifiuta"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
