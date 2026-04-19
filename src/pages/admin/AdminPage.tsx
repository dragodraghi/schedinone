import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { buildWC2026Matches, WC2026_GROUPS, countRealKickoffs } from "../../lib/worldcup2026";
import { recalcPointsClient } from "../../lib/recalcPoints";
import Toast, { type ToastData } from "../../components/Toast";
import QrCodeCard from "../../components/QrCodeCard";
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
  const [seeding, setSeeding] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const handleRecalcPoints = async () => {
    setRecalcing(true);
    try {
      const report = await recalcPointsClient(game.id);
      setToast({
        message: report.playersUpdated === 0
          ? `Tutto gia' aggiornato (${report.matchesCounted} partite concluse)`
          : `${report.playersUpdated} giocator${report.playersUpdated === 1 ? "e" : "i"} aggiornat${report.playersUpdated === 1 ? "o" : "i"}`,
        type: "success",
      });
    } catch (err) {
      console.error("Recalc error:", err);
      setToast({ message: "Errore nel ricalcolo. Riprova.", type: "error" });
    } finally {
      setRecalcing(false);
    }
  };


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
    { to: "/admin/confronto", label: "Confronto Giocatori", icon: "⚔️" },
  ];

  const handlePhaseChange = async (newPhase: Phase) => {
    if (newPhase === game.currentPhase) return;
    setSavingPhase(true);
    try {
      const gameRef = doc(db, "games", game.id);
      await updateDoc(gameRef, { currentPhase: newPhase });
    } catch (err) {
      console.error("Phase change error:", err);
    } finally {
      setSavingPhase(false);
    }
  };

  const handleSaveSpecial = async () => {
    setSavingSpecial(true);
    try {
      const gameRef = doc(db, "games", game.id);
      await updateDoc(gameRef, {
        topScorer: topScorerInput.trim() || null,
        winner: winnerInput.trim() || null,
      });
    } catch (err) {
      console.error("Save special error:", err);
    } finally {
      setSavingSpecial(false);
    }
  };


  /**
   * Destructive: deletes every existing match doc and re-seeds with the real
   * FIFA World Cup 2026 group stage (72 matches across 12 groups).
   * Firestore writeBatch limit is 500 ops per batch — we're at 72 delete + 72
   * create = 144 well under that, but we still split safely.
   */
  const handleSeedWorldCup = async () => {
    setShowSeedConfirm(false);
    setSeeding(true);
    try {
      const matchesRef = collection(db, "games", game.id, "matches");

      // 1. Delete all existing matches
      const existingSnap = await getDocs(matchesRef);
      const deleteBatch = writeBatch(db);
      existingSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();

      // 2. Insert the 72 matches with REAL FIFA kickoff dates (hardcoded
      //    from the published schedule — see worldcup2026.ts REAL_KICKOFFS_UTC).
      //    Matches with real kickoffs are marked "api" (so manual sync won't
      //    overwrite); if any kickoff falls back to synthetic we mark it so.
      const newMatches = buildWC2026Matches();
      const writeBatchRef = writeBatch(db);
      // REAL_KICKOFFS_UTC is an ISO date 2026-06-11 onwards; we know a
      // kickoff is real if it's before July 2026 and came from the lookup.
      // Simpler: the build function returns real-or-synthetic, so we do a
      // shallow check on what synthetic dates look like.
      const REAL_WINDOW_START = Date.UTC(2026, 5, 11, 0, 0); // 11 Jun
      const REAL_WINDOW_END = Date.UTC(2026, 5, 30, 0, 0);   // 30 Jun
      for (const m of newMatches) {
        const ms = m.kickoff.getTime();
        const isReal = ms >= REAL_WINDOW_START && ms <= REAL_WINDOW_END;
        const ref = doc(db, "games", game.id, "matches", m.id);
        writeBatchRef.set(ref, {
          phase: m.phase,
          group: m.group,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: Timestamp.fromDate(m.kickoff),
          kickoffSource: isReal ? "api" : "synthetic",
          result: null,
          score: null,
          locked: false,
        });
      }
      await writeBatchRef.commit();

      setToast({
        message: `${newMatches.length} partite caricate dal draw reale`,
        type: "success",
      });
    } catch (err) {
      console.error("Seed error:", err);
      setToast({ message: "Errore nel caricamento. Controlla i permessi.", type: "error" });
    } finally {
      setSeeding(false);
    }
  };

  const hasRealSchedule = matches.length >= 72 && matches.some(
    (m) => WC2026_GROUPS.some((g) => g.teams.includes(m.homeTeam))
  );

  // Count players who will lose data if we reseed
  const atRiskPlayers = players.filter(
    (p) => p.scheduleStatus === "inviata" || p.scheduleStatus === "accettata" ||
      (p.predictions && Object.keys(p.predictions).length > 0)
  ).length;

  return (
    <div className="space-y-6 animate-in">
      <Toast toast={toast} onDone={clearToast} />
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

      {/* Condividi il gioco (QR + invite buttons) */}
      <QrCodeCard />

      {/* World Cup 2026 seed */}
      <div className="glass rounded-xl p-4 space-y-3" style={{ border: '1px solid rgba(255, 215, 0, 0.25)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              🌍 Calendario Mondiali 2026
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hasRealSchedule ? "Calendario reale caricato — 48 squadre, 72 partite" : "Calendario placeholder — carica quello reale"}
            </p>
          </div>
          {hasRealSchedule && <span className="text-lg">✅</span>}
        </div>
        <button
          onClick={() => setShowSeedConfirm(true)}
          disabled={seeding}
          className="btn-glow w-full py-3 rounded-lg font-bold text-sm transition-all"
          style={{
            fontFamily: 'Outfit, sans-serif',
            background: hasRealSchedule
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.1))',
            color: hasRealSchedule ? 'var(--text-muted)' : 'var(--gold)',
            border: `1px solid ${hasRealSchedule ? 'var(--border)' : 'rgba(255,215,0,0.5)'}`,
            opacity: seeding ? 0.6 : 1,
          }}
        >
          {seeding ? "Caricamento in corso..." : hasRealSchedule ? "Ricarica draw reale (sostituisce tutto)" : "Carica draw ufficiale 5 dicembre 2025"}
        </button>
      </div>

      {/* Confirm seed modal */}
      {showSeedConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(4, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-4 animate-in"
            style={{ border: '1px solid rgba(255,215,0,0.3)', boxShadow: '0 0 40px rgba(255,215,0,0.1)' }}
          >
            <h2 className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
              🌍 Caricare il calendario reale?
            </h2>
            <div className="text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
              <p>Verranno <strong style={{ color: 'var(--wrong)' }}>cancellate tutte le partite esistenti</strong> e ricreate con il draw ufficiale del 5 dicembre 2025:</p>
              <ul className="text-xs space-y-0.5 pl-4" style={{ color: 'var(--text-primary)' }}>
                <li>• 48 squadre qualificate reali</li>
                <li>• 12 gironi (A–L)</li>
                <li>• 72 partite della fase a gironi</li>
                <li>• <strong style={{ color: 'var(--correct)' }}>{countRealKickoffs()}/72 date reali FIFA</strong> (11–28 giugno 2026)</li>
              </ul>
              {atRiskPlayers > 0 ? (
                <div
                  className="rounded-lg p-3 mt-3"
                  style={{
                    background: 'rgba(255, 51, 102, 0.1)',
                    border: '1px solid rgba(255, 51, 102, 0.4)',
                  }}
                >
                  <p className="text-xs font-black mb-1" style={{ color: 'var(--wrong)', fontFamily: 'Outfit, sans-serif' }}>
                    ⚠️ ATTENZIONE: {atRiskPlayers} giocator{atRiskPlayers === 1 ? 'e ha' : 'i hanno'} già pronostici salvati
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    I loro pronostici saranno persi definitivamente. Procedi solo se sei sicuro al 100%.
                  </p>
                </div>
              ) : (
                <p className="text-xs mt-2" style={{ color: 'var(--correct)' }}>
                  ✓ Nessun giocatore ha ancora inserito pronostici — operazione sicura.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSeedConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm glass transition-all"
                style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)' }}
              >
                Annulla
              </button>
              <button
                onClick={handleSeedWorldCup}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
                  color: '#040810',
                  boxShadow: '0 0 20px rgba(255,215,0,0.25)',
                }}
              >
                Sì, carica
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Manual recalc — normally not needed (it runs automatically when
            you save a result), but useful as a safety net or after bulk edits */}
        <button
          onClick={handleRecalcPoints}
          disabled={recalcing}
          className="glass w-full py-3 rounded-xl text-center font-bold transition-all hover:bg-white/5"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.8125rem',
            color: recalcing ? 'var(--text-muted)' : 'var(--correct)',
            borderColor: 'rgba(0,255,136,0.3)',
            opacity: recalcing ? 0.6 : 1,
          }}
        >
          {recalcing ? "Ricalcolo in corso..." : "🧮 Ricalcola punti classifica"}
        </button>
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
