import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Flag from "../../components/Flag";
import Toast, { type ToastData } from "../../components/Toast";
import { recalcPointsClient } from "../../lib/recalcPoints";
import type { Match, Sign } from "../../lib/types";

interface Props {
  matches: Match[];
  gameId: string;
}

const signs: Sign[] = ["1", "X", "2"];
const LOCK_LEAD_MS = 24 * 60 * 60 * 1000;

function shouldLockKickoff(date: Date): boolean {
  return date.getTime() <= Date.now() + LOCK_LEAD_MS;
}

type EditMode = "result" | "kickoff";

/** Format a Date as a datetime-local input value in the user's local time zone. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function RisultatiPage({ matches, gameId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("result");
  const [editScore, setEditScore] = useState("");
  const [editResult, setEditResult] = useState<Sign | null>(null);
  const [editKickoff, setEditKickoff] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const startEditResult = (match: Match) => {
    setEditingId(match.id);
    setEditMode("result");
    setEditScore(match.score ?? "");
    setEditResult(match.result);
  };

  const startEditKickoff = (match: Match) => {
    setEditingId(match.id);
    setEditMode("kickoff");
    setEditKickoff(match.kickoff ? toLocalInput(match.kickoff) : "");
  };

  const handleSaveResult = async (matchId: string) => {
    try {
      const ref = doc(db, "games", gameId, "matches", matchId);
      await updateDoc(ref, {
        result: editResult,
        score: editScore,
        locked: true,
        resultSource: "manual",
      });
      setEditingId(null);
      // Client-side auto-recalc (replaces what the Cloud Function would do
      // on a Blaze plan). Admins have write permission on player docs.
      const report = await recalcPointsClient(gameId);
      setToast({
        message: `Risultato salvato · ${report.playersUpdated} giocator${
          report.playersUpdated === 1 ? "e" : "i"
        } aggiornat${report.playersUpdated === 1 ? "o" : "i"}`,
        type: "success",
      });
    } catch (err) {
      console.error("Save result error:", err);
      setToast({ message: "Errore nel salvataggio", type: "error" });
    }
  };

  const handleSaveKickoff = async (matchId: string) => {
    try {
      if (!editKickoff) return;
      const newDate = new Date(editKickoff);
      if (isNaN(newDate.getTime())) {
        setToast({ message: "Data non valida", type: "error" });
        return;
      }
      const ref = doc(db, "games", gameId, "matches", matchId);
      await updateDoc(ref, {
        kickoff: Timestamp.fromDate(newDate),
        locked: shouldLockKickoff(newDate),
        // Marking as "manual" prevents the scheduled FIFA sync from
        // overwriting this edit later.
        kickoffSource: "manual",
      });
      setEditingId(null);
      setToast({ message: "Orario aggiornato!", type: "success" });
    } catch (err) {
      console.error("Save kickoff error:", err);
      setToast({ message: "Errore nel salvataggio", type: "error" });
    }
  };

  const groupedByPhase = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = [];
    acc[m.phase].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in">
      <Toast toast={toast} onDone={clearToast} />
      {/* Header */}
      <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
        Gestione Partite
      </h1>

      <Link
        to="/admin"
        className="block text-center text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        ← Admin
      </Link>

      {Object.entries(groupedByPhase).map(([phase, phaseMatches]) => (
        <div key={phase} className="space-y-2">
          <h2
            className="group-header text-[11px] uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            {phase}
          </h2>
          {phaseMatches.map((match) => (
            <div key={match.id} className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span
                  className="text-sm font-medium inline-flex items-center gap-1.5"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Flag team={match.homeTeam} size={12} /> {match.homeTeam}
                  <span style={{ color: "var(--text-muted)", margin: "0 2px" }}>vs</span>
                  {match.awayTeam} <Flag team={match.awayTeam} size={12} />
                </span>
                {match.result && editingId !== match.id && (
                  <div className="flex items-center gap-2">
                    {match.score && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {match.score}
                      </span>
                    )}
                    <span
                      className="px-2 py-1 rounded text-xs font-black"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: "rgba(0, 212, 255, 0.15)",
                        color: "var(--accent)",
                        border: "1px solid rgba(0, 212, 255, 0.3)",
                      }}
                    >
                      {match.result}
                    </span>
                  </div>
                )}
              </div>

              {/* Kickoff info — always visible */}
              {match.kickoff && editingId !== match.id && (
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  ⏱️{" "}
                  {match.kickoff.toLocaleString("it-IT", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}

              {editingId === match.id && editMode === "result" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Punteggio (es. 2-1)"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  />
                  <div className="flex gap-2">
                    {signs.map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditResult(s)}
                        className="flex-1 py-2 rounded-lg text-sm font-black transition-all"
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          background: editResult === s ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.05)",
                          color: editResult === s ? "var(--accent)" : "var(--text-muted)",
                          border: `1px solid ${editResult === s ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                          boxShadow: editResult === s ? "0 0 12px var(--accent-glow)" : "none",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveResult(match.id)}
                      disabled={!editResult}
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: editResult
                          ? "linear-gradient(135deg, var(--correct), #00cc6a)"
                          : "rgba(255,255,255,0.05)",
                        color: editResult ? "#040810" : "var(--text-muted)",
                        opacity: editResult ? 1 : 0.5,
                        cursor: editResult ? "pointer" : "not-allowed",
                      }}
                    >
                      Salva risultato
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-2 rounded-lg text-sm transition-all glass hover:bg-white/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {editingId === match.id && editMode === "kickoff" && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>
                    Data e ora calcio d'inizio
                  </label>
                  <input
                    type="datetime-local"
                    value={editKickoff}
                    onChange={(e) => setEditKickoff(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "DM Sans, sans-serif",
                      colorScheme: "dark",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKickoff(match.id)}
                      disabled={!editKickoff}
                      className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        background: editKickoff
                          ? "linear-gradient(135deg, var(--accent), #0099cc)"
                          : "rgba(255,255,255,0.05)",
                        color: editKickoff ? "#040810" : "var(--text-muted)",
                        opacity: editKickoff ? 1 : 0.5,
                      }}
                    >
                      Salva orario
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-2 rounded-lg text-sm transition-all glass hover:bg-white/5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {editingId !== match.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditResult(match)}
                    className="flex-1 py-2 rounded-lg text-xs transition-all glass hover:bg-white/5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✏️ {match.result ? "Correggi risultato" : "Inserisci risultato"}
                  </button>
                  <button
                    onClick={() => startEditKickoff(match)}
                    className="flex-1 py-2 rounded-lg text-xs transition-all glass hover:bg-white/5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    🕒 Modifica orario
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
