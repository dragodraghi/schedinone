import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Toast, { type ToastData } from "../../components/Toast";
import type { Game, Player, Match, ScheduleStatus } from "../../lib/types";

interface Props {
  players: Player[];
  matches: Match[];
  gameId: string;
  game: Game;
}

type FilterTab = "Tutte" | "In attesa" | "Accettate" | "Rifiutate";

function statusLabel(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "In attesa";
    case "accettata": return "Accettata";
    case "rifiutata": return "Rifiutata";
    default: return "Bozza";
  }
}

function statusColor(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "var(--accent)";
    case "accettata": return "var(--correct)";
    case "rifiutata": return "var(--wrong)";
    default: return "var(--text-muted)";
  }
}

function statusBg(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "rgba(0, 212, 255, 0.12)";
    case "accettata": return "rgba(0, 255, 136, 0.12)";
    case "rifiutata": return "rgba(255, 51, 102, 0.12)";
    default: return "rgba(255,255,255,0.05)";
  }
}

function statusBorder(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "rgba(0, 212, 255, 0.35)";
    case "accettata": return "rgba(0, 255, 136, 0.35)";
    case "rifiutata": return "rgba(255, 51, 102, 0.35)";
    default: return "var(--border)";
  }
}

export default function SchedineRicevutePage({ players, matches, gameId, game }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("Tutte");
  const [updating, setUpdating] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [showAcceptAllConfirm, setShowAcceptAllConfirm] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const totalMatches = matches.filter((m) => m.phase === game.currentPhase).length;

  const submitted = players.filter((p) => p.scheduleStatus !== "bozza");

  const filtered = submitted.filter((p) => {
    if (activeTab === "Tutte") return true;
    if (activeTab === "In attesa") return p.scheduleStatus === "inviata";
    if (activeTab === "Accettate") return p.scheduleStatus === "accettata";
    if (activeTab === "Rifiutate") return p.scheduleStatus === "rifiutata";
    return true;
  });

  const tabCounts: Record<FilterTab, number> = {
    "Tutte": submitted.length,
    "In attesa": submitted.filter((p) => p.scheduleStatus === "inviata").length,
    "Accettate": submitted.filter((p) => p.scheduleStatus === "accettata").length,
    "Rifiutate": submitted.filter((p) => p.scheduleStatus === "rifiutata").length,
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
  const payablePendingPlayers = pendingPlayers.filter((p) => p.paid);
  const unpaidPendingCount = pendingPlayers.length - payablePendingPlayers.length;

  const acceptAll = async () => {
    if (payablePendingPlayers.length === 0) return;
    const count = payablePendingPlayers.length;
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
      for (const p of payablePendingPlayers) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            📬 Schedine Ricevute
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {submitted.length} inviate · {players.length} totali
          </p>
        </div>
        <Link
          to="/admin"
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass"
          style={{ color: "var(--text-muted)" }}
        >
          ← Admin
        </Link>
      </div>

      {/* Accetta pagate button */}
      {payablePendingPlayers.length > 0 && (
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
          {acceptingAll ? "Accettando..." : `✓ Accetta pagate (${payablePendingPlayers.length})`}
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
            Segna "Pagato" nella pagina Giocatori prima di accettare.
          </p>
        </div>
      )}

      {/* Confirm bulk accept modal */}
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
              ✓ Accettare {payablePendingPlayers.length} schedin{payablePendingPlayers.length === 1 ? "a" : "e"} pagat{payablePendingPlayers.length === 1 ? "a" : "e"}?
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Solo le schedine gia' segnate come pagate verranno contrassegnate come <strong style={{ color: "var(--correct)" }}>accettate</strong> e i pronostici saranno visibili nel Griglione. L'operazione si puo' annullare rifiutandole una per una.
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
                Si, accetta pagate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
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

      {/* Cards */}
      {filtered.length === 0 ? (
        <div
          className="glass rounded-xl p-8 text-center"
          style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}
        >
          <div className="text-3xl mb-2">📭</div>
          <p className="font-bold">Nessuna schedina in questa categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((player) => {
            const filledCount = matches
              .filter((m) => m.phase === game.currentPhase)
              .filter((m) => player.predictions[m.id]).length;

            const isInviata = player.scheduleStatus === "inviata";
            const canAccept = player.paid;
            const acceptKey = player.id + "accettata";
            const rejectKey = player.id + "rifiutata";

            return (
              <div
                key={player.id}
                className="glass rounded-xl p-4 space-y-3 animate-in"
                style={{
                  border: `1px solid ${statusBorder(player.scheduleStatus)}`,
                  boxShadow: isInviata ? "0 0 16px rgba(0,212,255,0.08)" : "none",
                }}
              >
                {/* Top row: name + status badge */}
                <div className="flex items-center justify-between">
                  <p
                    className="text-base font-black"
                    style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}
                  >
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

                {/* Stats row */}
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

                  {player.topScorerPick && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                        Capocannoniere
                      </span>
                      <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>
                        {player.topScorerPick}
                      </span>
                    </div>
                  )}

                  {player.winnerPick && (
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

                {/* Action buttons for pending schedine */}
                {isInviata && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (canAccept) updateStatus(player.id, "accettata");
                      }}
                      disabled={updating === acceptKey || !canAccept}
                      aria-label={canAccept ? `Accetta schedina ${player.name}` : `Pagamento mancante per ${player.name}`}
                      title={canAccept ? "Accetta schedina" : "Segna il pagamento prima di accettare"}
                      className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: canAccept ? "rgba(0,255,136,0.15)" : "rgba(255,215,0,0.08)",
                        color: canAccept ? "var(--correct)" : "var(--gold)",
                        border: `1px solid ${canAccept ? "rgba(0,255,136,0.4)" : "rgba(255,215,0,0.32)"}`,
                        opacity: updating === acceptKey ? 0.6 : 1,
                        boxShadow: canAccept ? "0 0 12px rgba(0,255,136,0.1)" : "none",
                        cursor: canAccept ? "pointer" : "not-allowed",
                      }}
                    >
                      {updating === acceptKey ? "..." : canAccept ? "✓ Accetta" : "Pagamento mancante"}
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
