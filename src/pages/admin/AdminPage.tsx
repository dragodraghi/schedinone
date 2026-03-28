import { useState } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Game, Player, Match, Phase } from "../../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
  onLogout: () => void;
}

const PHASES: Phase[] = ["gironi", "ottavi", "quarti", "semifinali", "finale"];

export default function AdminPage({ game, players, matches, onLogout }: Props) {
  const [savingPhase, setSavingPhase] = useState(false);
  const [topScorerInput, setTopScorerInput] = useState(game.topScorer ?? "");
  const [winnerInput, setWinnerInput] = useState(game.winner ?? "");
  const [savingSpecial, setSavingSpecial] = useState(false);

  const paidCount = players.filter((p) => p.paid).length;
  const prize = game.entryFee * paidCount;
  const pendingCount = players.filter((p) => p.scheduleStatus === "inviata").length;

  const kpis = [
    { label: "Iscritti", value: players.length, color: 'var(--accent)' },
    { label: "Montepremi", value: `€${prize}`, color: 'var(--gold)' },
    { label: "Partite", value: matches.length, color: 'var(--correct)' },
    { label: "In attesa", value: pendingCount, color: 'var(--gold)' },
  ];

  const actions = [
    { to: "/admin/riepilogo", label: "Riepilogo Schedine", icon: "📊" },
    { to: "/admin/schedine", label: "Schedine Ricevute", icon: "📬" },
    { to: "/admin/risultati", label: "Gestisci Risultati", icon: "🔄" },
    { to: "/admin/giocatori", label: "Gestisci Giocatori", icon: "👥" },
  ];

  const handlePhaseChange = async (newPhase: Phase) => {
    if (newPhase === game.currentPhase) return;
    setSavingPhase(true);
    const gameRef = doc(db, "games", game.id);
    await updateDoc(gameRef, { currentPhase: newPhase });
    setSavingPhase(false);
  };

  const handleSaveSpecial = async () => {
    setSavingSpecial(true);
    const gameRef = doc(db, "games", game.id);
    await updateDoc(gameRef, {
      topScorer: topScorerInput.trim() || null,
      winner: winnerInput.trim() || null,
    });
    setSavingSpecial(false);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>Pannello COMITATO</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestione partita</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl p-3 text-center">
            <p className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: kpi.color }}>{kpi.value}</p>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Phase management */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Avanza Fase</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Fase corrente:{" "}
          <span className="font-black capitalize" style={{ color: 'var(--accent)' }}>{game.currentPhase}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {PHASES.map((phase) => {
            const isActive = game.currentPhase === phase;
            return (
              <button
                key={phase}
                onClick={() => handlePhaseChange(phase)}
                disabled={savingPhase}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: isActive ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${isActive ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                  boxShadow: isActive ? '0 0 8px rgba(0,212,255,0.25)' : 'none',
                  opacity: savingPhase ? 0.6 : 1,
                }}
              >
                {phase}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action links */}
      <div className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="btn-glow glass block w-full py-3.5 rounded-xl text-center font-bold transition-all hover:bg-white/5"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
            }}
          >
            {action.icon} {action.label}
          </Link>
        ))}
      </div>

      {/* TopScorer / Winner settings */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Pronostici Speciali</p>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Capocannoniere</label>
            <input
              type="text"
              value={topScorerInput}
              onChange={(e) => setTopScorerInput(e.target.value)}
              placeholder="Nome giocatore"
              className="w-full mt-1 px-3 py-2 bg-white/5 border rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none transition-all"
              style={{ borderColor: topScorerInput ? 'rgba(255,215,0,0.3)' : 'var(--border)' }}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Vincitrice</label>
            <input
              type="text"
              value={winnerInput}
              onChange={(e) => setWinnerInput(e.target.value)}
              placeholder="Nome squadra"
              className="w-full mt-1 px-3 py-2 bg-white/5 border rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none transition-all"
              style={{ borderColor: winnerInput ? 'rgba(255,215,0,0.3)' : 'var(--border)' }}
            />
          </div>
          <button
            onClick={handleSaveSpecial}
            disabled={savingSpecial}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
            style={{
              fontFamily: 'Outfit, sans-serif',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))',
              color: 'var(--gold)',
              border: '1px solid rgba(255,215,0,0.4)',
              opacity: savingSpecial ? 0.6 : 1,
            }}
          >
            {savingSpecial ? "Salvando..." : "Salva"}
          </button>
        </div>
      </div>

      <Link
        to="/"
        className="block text-center text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Torna alla Dashboard
      </Link>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="glass w-full py-3 font-bold rounded-xl transition-all duration-200 hover:bg-red-600/10"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.875rem',
          color: 'var(--wrong)',
          borderColor: 'rgba(255,51,102,0.4)',
        }}
      >
        Esci
      </button>
    </div>
  );
}
