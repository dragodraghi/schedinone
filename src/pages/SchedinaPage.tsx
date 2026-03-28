import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import MatchCard from "../components/MatchCard";
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("var(--correct)");
  const [toastBg, setToastBg] = useState("rgba(0,255,136,0.12)");
  const [toastBorder, setToastBorder] = useState("rgba(0,255,136,0.4)");
  const [topScorerPick, setTopScorerPick] = useState(player.topScorerPick || "");
  const [winnerPick, setWinnerPick] = useState(player.winnerPick || "");
  const [localStatus, setLocalStatus] = useState(player.scheduleStatus);

  const status = localStatus;
  const isReadOnly = status === "inviata" || status === "accettata";
  const isRifiutata = status === "rifiutata";

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

  const showToastMsg = (msg: string, color: string, bg: string, border: string) => {
    setToastMessage(msg);
    setToastColor(color);
    setToastBg(bg);
    setToastBorder(border);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    const ref = doc(db, "games", gameId, "players", player.id);
    await updateDoc(ref, {
      predictions,
      topScorerPick,
      winnerPick,
      scheduleStatus: "inviata",
    });
    setLocalStatus("inviata");
    setSaving(false);
    showToastMsg(
      "Schedina inviata al Comitato!",
      "var(--accent)",
      "rgba(0,212,255,0.12)",
      "rgba(0,212,255,0.4)"
    );
  };

  const filledCount = phaseMatches.filter((m) => predictions[m.id]).length;
  const allFilled = filledCount === phaseMatches.length && topScorerPick && winnerPick;

  return (
    <div className="space-y-4 animate-in">
      {/* Toast notification */}
      {showToast && (
        <div
          className="fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold animate-in"
          style={{
            transform: "translateX(-50%)",
            fontFamily: "Outfit, sans-serif",
            background: toastBg,
            border: `1px solid ${toastBorder}`,
            color: toastColor,
            backdropFilter: "blur(12px)",
            boxShadow: `0 0 20px ${toastBg}`,
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>Schedina</h1>
          <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
            Fase: {game.currentPhase}
          </p>
        </div>
        <div className="counter-pill px-3 py-1.5 rounded-full text-xs">
          <span style={{ color: filledCount === phaseMatches.length ? "var(--correct)" : "var(--accent)" }}>{filledCount}</span>
          <span style={{ color: "var(--text-muted)" }}>/{phaseMatches.length}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groups).map(([groupName, groupMatches], i) => (
          <div
            key={groupName}
            className="space-y-1.5 animate-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <h2 className="group-header text-[11px] uppercase tracking-wider" style={{ color: "var(--accent)" }}>
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
            disabled={isReadOnly}
            className="w-full mt-1 px-2 py-1.5 bg-white/5 border rounded text-sm text-white placeholder-[#475569] focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderColor: winnerPick ? "rgba(255, 215, 0, 0.3)" : "var(--border)" }}
          />
        </div>
      </div>

      {/* Save button — hidden when read-only */}
      {!isReadOnly && (
        <button
          onClick={handleSave}
          disabled={saving || !allFilled}
          className={`btn-glow w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 ${allFilled ? "pulse-ring" : ""}`}
          style={{
            fontFamily: "Outfit, sans-serif",
            background: "linear-gradient(135deg, #00d4ff, #0099cc)",
            color: "#040810",
            boxShadow: "0 0 30px rgba(0, 212, 255, 0.15)",
            opacity: saving || !allFilled ? 0.6 : 1,
          }}
        >
          {saving ? "Invio in corso..." : "SALVA E INVIA AL COMITATO"}
        </button>
      )}

      <p className="text-[10px] text-center pb-2" style={{ color: "var(--text-muted)" }}>
        I pronostici si chiudono 1 ora prima del calcio d'inizio
      </p>
    </div>
  );
}
