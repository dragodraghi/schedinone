import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
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
import { getWorldCupSeedSafety } from "../../lib/adminSafety";
import { subscribeAllThreads } from "../../lib/chat";
import Toast, { type ToastData } from "../../components/Toast";
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
  const [unreadCommitteeMessages, setUnreadCommitteeMessages] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    return subscribeAllThreads(game.id, (threads) => {
      setUnreadCommitteeMessages(
        threads.reduce((total, thread) => {
          const unread = Number(thread.unreadByCommittee);
          return total + (Number.isFinite(unread) && unread > 0 ? unread : 0);
        }, 0)
      );
    });
  }, [game.id]);

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
    { label: "Iscritti", value: players.length, color: "var(--accent)" },
    { label: "Montepremi", value: `EUR ${prize}`, color: "var(--gold)" },
    { label: "Partite", value: matches.length, color: "var(--correct)" },
    { label: "In attesa", value: pendingCount, color: "var(--gold)" },
  ];

  const actions = [
    { to: "/admin/riepilogo", label: "Riepilogo Schedine", mark: "GRD" },
    { to: "/admin/risultati", label: "Gestisci Risultati", mark: "RES" },
    { to: "/admin/giocatori", label: "Gestisci Giocatori", mark: "PLY" },
    { to: "/admin/confronto", label: "Confronto Giocatori", mark: "VS" },
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

  const handleSeedWorldCup = async () => {
    setShowSeedConfirm(false);
    setSeeding(true);
    try {
      const matchesRef = collection(db, "games", game.id, "matches");

      const existingSnap = await getDocs(matchesRef);
      const deleteBatch = writeBatch(db);
      existingSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();

      const newMatches = buildWC2026Matches();
      const writeBatchRef = writeBatch(db);
      const REAL_WINDOW_START = Date.UTC(2026, 5, 11, 0, 0);
      const REAL_WINDOW_END = Date.UTC(2026, 5, 30, 0, 0);
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

  const seedSafety = getWorldCupSeedSafety(players);
  const atRiskPlayers = seedSafety.atRiskPlayers;
  const urgentActions = [
    {
      to: "/admin/schedine",
      label: "Schedine da controllare",
      value: pendingCount,
      detail: pendingCount > 0 ? "In attesa di verifica" : "Nessuna in attesa",
      mark: "IN",
      color: pendingCount > 0 ? "var(--wrong)" : "var(--text-muted)",
    },
    {
      to: "/admin/messaggi",
      label: "Messaggi",
      value: unreadCommitteeMessages > 0 ? unreadCommitteeMessages : "Apri",
      detail: unreadCommitteeMessages > 0
        ? `${unreadCommitteeMessages} messagg${unreadCommitteeMessages === 1 ? "io" : "i"} da leggere`
        : "Richieste e risposte private",
      mark: "MSG",
      color: unreadCommitteeMessages > 0 ? "var(--wrong)" : "var(--accent)",
    },
    {
      to: "/admin/annunci",
      label: "Annunci",
      value: "Info",
      detail: "Comunicazioni di servizio",
      mark: "ANN",
      color: "var(--gold)",
    },
  ];

  return (
    <div className="space-y-5 animate-in">
      <Toast toast={toast} onDone={clearToast} />

      <header className="page-head">
        <div className="min-w-0">
          <p className="page-kicker">Area Comitato</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Pannello operativo</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Gestione gioco, schedine e comunicazioni.</p>
        </div>
        <Link to="/" className="secondary-action grid shrink-0 place-items-center px-3 text-center text-[11px] uppercase tracking-[0.12em]">
          Home
        </Link>
      </header>

      <section aria-label="Urgenze Comitato" className="surface-panel p-4 sm:p-5">
        <div className="mb-3">
          <p className="page-kicker">Urgenze</p>
          <h2 className="text-lg font-black">Cose da controllare</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {urgentActions.map((action) => (
            <Link key={action.to} to={action.to} className="admin-tile card-tap">
              <span className="admin-mark">{action.mark}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[var(--text-primary)]">{action.label}</span>
                <span className="micro-label mt-0.5 block">{action.detail}</span>
              </span>
              <span className="shrink-0 text-lg font-black leading-none" style={{ color: action.color }}>
                {action.value}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-black leading-none" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      <section className="surface-panel p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="micro-label">Fase torneo</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Fase corrente: <span className="font-black capitalize text-[var(--accent)]">{game.currentPhase}</span>
            </p>
          </div>
          {savingPhase && <span className="micro-label text-[var(--accent)]">Salvataggio</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {PHASES.map((phase) => {
            const isActive = game.currentPhase === phase;
            return (
              <button
                key={phase}
                onClick={() => handlePhaseChange(phase)}
                disabled={savingPhase}
                className="phase-chip px-3 transition-all disabled:opacity-50"
                style={{
                  background: isActive ? "rgba(0,212,255,0.14)" : undefined,
                  borderColor: isActive ? "rgba(0,212,255,0.42)" : undefined,
                  color: isActive ? "var(--accent)" : undefined,
                }}
              >
                {phase}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="status-panel p-4 sm:p-5"
        style={{
          "--status-bg": hasRealSchedule ? "rgba(45, 212, 129, 0.1)" : "rgba(255, 215, 0, 0.1)",
          "--status-border": hasRealSchedule ? "rgba(45, 212, 129, 0.32)" : "rgba(255, 215, 0, 0.3)",
        } as CSSProperties}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="micro-label" style={{ color: hasRealSchedule ? "var(--pitch)" : "var(--gold)" }}>
              Calendario Mondiali 2026
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {hasRealSchedule ? "Calendario reale caricato: 48 squadre, 72 partite." : "Calendario placeholder: carica quello reale."}
            </p>
          </div>
          <span
            className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
            style={{
              background: hasRealSchedule ? "rgba(45,212,129,0.12)" : "rgba(255,215,0,0.12)",
              color: hasRealSchedule ? "var(--pitch)" : "var(--gold)",
            }}
          >
            {hasRealSchedule ? "OK" : "TODO"}
          </span>
        </div>
        <button
          onClick={() => setShowSeedConfirm(true)}
          disabled={seeding}
          className="secondary-action mt-4 w-full px-4 disabled:opacity-50"
          style={{
            borderColor: hasRealSchedule ? "var(--border)" : "rgba(255,215,0,0.38)",
            color: hasRealSchedule ? "var(--text-soft)" : "var(--gold)",
          }}
        >
          {seeding ? "Caricamento in corso..." : hasRealSchedule ? "Ricarica draw reale (sostituisce tutto)" : "Carica draw ufficiale 5 dicembre 2025"}
        </button>
      </section>

      {showSeedConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(4, 8, 16, 0.88)", backdropFilter: "blur(10px)" }}
        >
          <div className="modal-panel w-full max-w-sm space-y-4 p-5 animate-in">
            <h2 className="text-lg font-black text-[var(--gold)]">Caricare il calendario reale?</h2>
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>
                Verranno <strong className="text-[var(--wrong)]">cancellate tutte le partite esistenti</strong> e
                ricreate con il draw ufficiale del 5 dicembre 2025.
              </p>
              <ul className="space-y-1 pl-4 text-xs text-[var(--text-primary)]">
                <li>48 squadre qualificate reali</li>
                <li>12 gironi (A-L)</li>
                <li>72 partite della fase a gironi</li>
                <li>
                  <strong className="text-[var(--correct)]">{countRealKickoffs()}/72 date reali FIFA</strong> (11-28
                  giugno 2026)
                </li>
              </ul>
              {atRiskPlayers > 0 ? (
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{
                    background: "rgba(255, 51, 102, 0.1)",
                    border: "1px solid rgba(255, 51, 102, 0.4)",
                  }}
                >
                  <p className="mb-1 text-xs font-black text-[var(--wrong)]">
                    ATTENZIONE: {atRiskPlayers} giocator{atRiskPlayers === 1 ? "e ha" : "i hanno"} gia' pronostici
                    salvati
                  </p>
                  <p className="text-[11px] text-[var(--text-primary)]">
                    I loro pronostici saranno persi definitivamente. Procedi solo se sei sicuro al 100%.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--correct)]">
                  Nessun giocatore ha ancora inserito pronostici: operazione sicura.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSeedConfirm(false)} className="secondary-action flex-1 px-3">
                Annulla
              </button>
              {seedSafety.blocked ? (
                <button disabled className="secondary-action flex-1 px-3 opacity-45">
                  Bloccato
                </button>
              ) : (
                <button onClick={handleSeedWorldCup} disabled={seedSafety.blocked} className="primary-action flex-1 px-3">
                  Si, carica
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="page-kicker">Operazioni</p>
            <h2 className="text-lg font-black">Strumenti Comitato</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className="admin-tile card-tap">
              <span className="admin-mark">{action.mark}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[var(--text-primary)]">{action.label}</span>
                <span className="micro-label mt-0.5 block">Apri sezione</span>
              </span>
            </Link>
          ))}
        </div>
        <button
          onClick={handleRecalcPoints}
          disabled={recalcing}
          className="secondary-action mt-3 w-full px-4 disabled:opacity-50"
          style={{ borderColor: "rgba(0,255,136,0.28)", color: recalcing ? "var(--text-muted)" : "var(--correct)" }}
        >
          {recalcing ? "Ricalcolo in corso..." : "Ricalcola punti classifica"}
        </button>
      </section>

      <section className="surface-panel p-4 sm:p-5">
        <p className="micro-label" style={{ color: "var(--gold)" }}>Pronostici speciali</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="micro-label mb-2 block">Capocannoniere</span>
            <input
              type="text"
              value={topScorerInput}
              onChange={(e) => setTopScorerInput(e.target.value)}
              placeholder="Nome giocatore"
              className="app-field px-3 py-2 text-sm placeholder-[#475569]"
              style={{ borderColor: topScorerInput ? "rgba(255,215,0,0.3)" : "var(--border)" }}
            />
          </label>
          <label className="block">
            <span className="micro-label mb-2 block">Vincitrice</span>
            <input
              type="text"
              value={winnerInput}
              onChange={(e) => setWinnerInput(e.target.value)}
              placeholder="Nome squadra"
              className="app-field px-3 py-2 text-sm placeholder-[#475569]"
              style={{ borderColor: winnerInput ? "rgba(255,215,0,0.3)" : "var(--border)" }}
            />
          </label>
        </div>
        <button
          onClick={handleSaveSpecial}
          disabled={savingSpecial}
          className="secondary-action mt-3 w-full px-4 disabled:opacity-50"
          style={{ borderColor: "rgba(255,215,0,0.34)", color: "var(--gold)" }}
        >
          {savingSpecial ? "Salvando..." : "Salva pronostici speciali"}
        </button>
      </section>

      <button onClick={onLogout} className="danger-action w-full px-4">
        Esci
      </button>
    </div>
  );
}
