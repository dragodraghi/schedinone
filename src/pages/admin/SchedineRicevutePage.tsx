import { useState } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
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
    const ref = doc(db, "games", gameId, "players", playerId);
    await updateDoc(ref, { scheduleStatus: status });
    setUpdating(null);
  };

  return (
    <div className="space-y-4 animate-in">
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
                </div>

                {/* Action buttons for pending schedine */}
                {isInviata && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(player.id, "accettata")}
                      disabled={updating === acceptKey}
                      className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: "rgba(0,255,136,0.15)",
                        color: "var(--correct)",
                        border: "1px solid rgba(0,255,136,0.4)",
                        opacity: updating === acceptKey ? 0.6 : 1,
                        boxShadow: "0 0 12px rgba(0,255,136,0.1)",
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
