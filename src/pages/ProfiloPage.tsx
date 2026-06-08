import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import InviteButton from "../components/InviteButton";
import PaymentInfoCard from "../components/PaymentInfoCard";
import { hardRefreshApp } from "../lib/appRefresh";
import type { Game, Player, Match, ScheduleStatus } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
  isAdmin: boolean;
  hasPlayerProfile?: boolean;
  unreadAnnouncementCount?: number;
  unreadPrivateMessageCount?: number;
  onLogout: () => void;
}

function scheduleLabel(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "Inviata al Comitato";
    case "accettata": return "Accettata";
    case "rifiutata": return "Da correggere";
    default: return "In bozza";
  }
}

function scheduleColor(status: ScheduleStatus): string {
  switch (status) {
    case "inviata": return "var(--accent)";
    case "accettata": return "var(--correct)";
    case "rifiutata": return "var(--wrong)";
    default: return "var(--text-muted)";
  }
}

export default function ProfiloPage({
  game,
  player,
  players,
  matches,
  isAdmin,
  hasPlayerProfile,
  unreadAnnouncementCount = 0,
  unreadPrivateMessageCount = 0,
  onLogout,
}: Props) {
  const [refreshingApp, setRefreshingApp] = useState(false);
  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);
  const filledCount = phaseMatches.filter((m) => player.predictions[m.id]).length;
  const rank = players.findIndex((p) => p.id === player.id) + 1;
  const rankText = rank > 0 ? `${rank}° su ${players.length}` : `- su ${players.length}`;
  const statusColor = scheduleColor(player.scheduleStatus);
  const showPlayerLinks = !isAdmin || hasPlayerProfile;

  const handleHardRefresh = async () => {
    setRefreshingApp(true);
    await hardRefreshApp();
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>{player.name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {player.points} punti totali
          </p>
        </div>
        <Link
          to="/"
          className="glass px-3 py-2 rounded-xl text-xs font-bold transition-all card-tap"
          style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}
        >
          Home
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Posizione
          </p>
          <p className="text-2xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
            {rankText}
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Pronostici
          </p>
          <p className="text-2xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: filledCount === phaseMatches.length ? 'var(--correct)' : 'var(--accent)' }}>
            {filledCount}/{phaseMatches.length}
          </p>
        </div>
      </div>

      <PaymentInfoCard teamName={player.name} entryFee={game.entryFee} paid={player.paid} />

      <div className="glass rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Stato schedina
        </p>
        <p className="text-lg font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: statusColor }}>
          {scheduleLabel(player.scheduleStatus)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          La fase corrente è {game.currentPhase}. Il Griglione completo si apre dopo la chiusura e con tutte le schedine accettate.
        </p>
      </div>

      {showPlayerLinks && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/bacheca"
            className="glass rounded-xl p-4 card-tap"
            style={{ color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
                📢 Avvisi Comitato
              </p>
              {unreadAnnouncementCount > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: 'var(--wrong)', color: '#fff' }}>
                  {unreadAnnouncementCount} da leggere
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {unreadAnnouncementCount > 0
                ? 'Apri e leggi la comunicazione di servizio.'
                : 'Comunicazioni e aggiornamenti ufficiali.'}
            </p>
          </Link>
          <Link
            to="/messaggi"
            className="glass rounded-xl p-4 card-tap"
            style={{ color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: unreadPrivateMessageCount > 0 ? 'var(--wrong)' : 'var(--accent)' }}>
                📩 Contatta Comitato
              </p>
              {unreadPrivateMessageCount > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: 'var(--wrong)', color: '#fff' }}>
                  {unreadPrivateMessageCount} {unreadPrivateMessageCount === 1 ? 'risposta' : 'risposte'}
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {unreadPrivateMessageCount > 0
                ? 'Risposta personale del Comitato da leggere.'
                : 'Per problemi con accesso, pagamento o schedina.'}
            </p>
          </Link>
        </div>
      )}

      <div className="glass rounded-xl p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
          Regole rapide
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Pronostica 1, X o 2 per ogni partita. Ogni risultato corretto vale 1 punto.
          Capocannoniere e vincitrice sono premi separati, gestiti dal Comitato.
        </p>
      </div>

      {isAdmin && <InviteButton />}

      <button
        onClick={handleHardRefresh}
        disabled={refreshingApp}
        className="glass w-full py-3 font-bold rounded-xl transition-all duration-200 disabled:opacity-70"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.875rem',
          color: 'var(--gold)',
          borderColor: 'rgba(255,215,0,0.35)',
        }}
      >
        {refreshingApp ? "Aggiornamento..." : "Aggiorna app"}
      </button>

      {isAdmin ? (
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
      ) : (
        <>
          <div
            className="status-panel px-4 py-3"
            style={{
              "--status-bg": "rgba(0, 212, 255, 0.08)",
              "--status-border": "rgba(0, 212, 255, 0.28)",
            } as CSSProperties}
          >
            <p className="font-black text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>
              Accesso salvato su questo dispositivo
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Usa sempre lo stesso browser o la stessa icona installata. Se cancelli i dati del sito o cambi browser,
              chiedi al Comitato di recuperare la squadra.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="glass w-full py-3 font-bold rounded-xl transition-all duration-200"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--gold)',
              borderColor: 'rgba(255,215,0,0.4)',
            }}
          >
            Entra come Comitato
          </button>
        </>
      )}
    </div>
  );
}
