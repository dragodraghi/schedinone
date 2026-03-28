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
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [topScorerPick, setTopScorerPick] = useState(player.topScorerPick || "");
  const [winnerPick, setWinnerPick] = useState(player.winnerPick || "");

  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);

  const groups = phaseMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group ?? m.phase;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const handlePredict = (matchId: string, sign: Sign) => {
    setPredictions((prev) => ({ ...prev, [matchId]: sign }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const ref = doc(db, "games", gameId, "players", player.id);
    await updateDoc(ref, { predictions, topScorerPick, winnerPick });
    setSaving(false);
    setSaved(true);
    setShowToast(true);
    setTimeout(() => setSaved(false), 2000);
    setTimeout(() => setShowToast(false), 2000);
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
            transform: 'translateX(-50%)',
            fontFamily: 'Outfit, sans-serif',
            background: 'rgba(0,255,136,0.12)',
            border: '1px solid rgba(0,255,136,0.4)',
            color: 'var(--correct)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 20px rgba(0,255,136,0.2)',
          }}
        >
          ✓ Pronostici salvati!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Schedina</h1>
          <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}>
            Fase: {game.currentPhase}
          </p>
        </div>
        <div className="counter-pill px-3 py-1.5 rounded-full text-xs">
          <span style={{ color: filledCount === phaseMatches.length ? 'var(--correct)' : 'var(--accent)' }}>{filledCount}</span>
          <span style={{ color: 'var(--text-muted)' }}>/{phaseMatches.length}</span>
        </div>
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groups).map(([groupName, groupMatches], i) => (
          <div
            key={groupName}
            className="space-y-1.5 animate-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <h2 className="group-header text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              {game.currentPhase === "gironi" ? `Gruppo ${groupName}` : groupName}
            </h2>
            {groupMatches.map((match) => (
              <MatchCard key={match.id} match={match} prediction={predictions[match.id] ?? null} onPredict={handlePredict} />
            ))}
          </div>
        ))}
      </div>

      {/* Special picks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass rounded-lg px-3 py-2.5">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Capocannoniere</label>
          <input type="text" value={topScorerPick} onChange={(e) => { setTopScorerPick(e.target.value); setSaved(false); }} placeholder="Nome giocatore"
            className="w-full mt-1 px-2 py-1.5 bg-white/5 border rounded text-sm text-white placeholder-[#475569] focus:outline-none transition-all duration-200"
            style={{ borderColor: topScorerPick ? 'rgba(255, 215, 0, 0.3)' : 'var(--border)' }} />
        </div>
        <div className="glass rounded-lg px-3 py-2.5">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Vincitrice Mondiale</label>
          <input type="text" value={winnerPick} onChange={(e) => { setWinnerPick(e.target.value); setSaved(false); }} placeholder="Nome squadra"
            className="w-full mt-1 px-2 py-1.5 bg-white/5 border rounded text-sm text-white placeholder-[#475569] focus:outline-none transition-all duration-200"
            style={{ borderColor: winnerPick ? 'rgba(255, 215, 0, 0.3)' : 'var(--border)' }} />
        </div>
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className={`btn-glow w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 ${allFilled ? 'pulse-ring' : ''}`}
        style={{
          fontFamily: 'Outfit, sans-serif',
          background: saved ? 'linear-gradient(135deg, #00ff88, #00cc6a)' : 'linear-gradient(135deg, #00d4ff, #0099cc)',
          color: '#040810',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.15)',
          opacity: saving ? 0.6 : 1,
        }}>
        {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva pronostici"}
      </button>

      <p className="text-[10px] text-center pb-2" style={{ color: 'var(--text-muted)' }}>
        I pronostici si chiudono 1 ora prima del calcio d'inizio
      </p>
    </div>
  );
}
