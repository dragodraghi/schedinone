import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import Flag from "../components/Flag";
import { getNextMatch, formatCountdown, getMatchStatus } from "../lib/matchStatus";
import type { Game, Player, Match } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
  unreadAnnouncementCount?: number;
  latestAnnouncementTitle?: string;
  unreadPrivateMessageCount?: number;
  latestPrivateMessagePreview?: string;
}

export default function DashboardPage({
  game,
  player,
  matches,
  unreadAnnouncementCount = 0,
  latestAnnouncementTitle,
  unreadPrivateMessageCount = 0,
  latestPrivateMessagePreview,
}: Props) {
  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);
  const totalMatches = phaseMatches.length;
  const filledPredictions = phaseMatches.filter((m) => player.predictions[m.id]).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const liveMatch = matches.find((m) => getMatchStatus(m, now) === "live");
  const nextMatch = getNextMatch(matches, now);
  const remainingMs = nextMatch?.kickoff ? nextMatch.kickoff.getTime() - now.getTime() : 0;
  const missingPredictions = Math.max(totalMatches - filledPredictions, 0);
  const completion = totalMatches > 0 ? Math.round((filledPredictions / totalMatches) * 100) : 0;
  const scheduleState = {
    bozza: {
      label: "Da completare",
      detail: missingPredictions > 0 ? `Mancano ${missingPredictions} pronostici` : "Pronta da inviare",
      color: "var(--accent)",
    },
    inviata: {
      label: "Inviata",
      detail: "In attesa del Comitato",
      color: "var(--accent)",
    },
    accettata: {
      label: "Accettata",
      detail: "Confermata dal Comitato",
      color: "var(--correct)",
    },
    rifiutata: {
      label: "Da correggere",
      detail: "Modifica e reinvia",
      color: "var(--wrong)",
    },
  }[player.scheduleStatus];
  const hasUnreadAnnouncements = unreadAnnouncementCount > 0;
  const hasUnreadPrivateMessages = unreadPrivateMessageCount > 0;
  const hasCommitteeUpdates = hasUnreadAnnouncements || hasUnreadPrivateMessages;
  const committeeAlertLink = hasUnreadPrivateMessages ? "/messaggi" : "/bacheca";
  const committeeAlertLabel = hasUnreadPrivateMessages ? "Risposta del Comitato" : "Comunicazione da leggere";
  const committeeAlertTitle = hasUnreadPrivateMessages
    ? latestPrivateMessagePreview || "Messaggio personale da leggere"
    : latestAnnouncementTitle || "Avviso del Comitato";
  const committeeAlertDetail = hasUnreadPrivateMessages
    ? "Apri Contatta Comitato per leggere la risposta."
    : "Apri Avvisi Comitato per leggere prima di continuare.";

  return (
    <div className="space-y-5 animate-in">
      <header className="page-head">
        <div className="min-w-0">
          <p className="page-kicker">SCHEDINONE 2026</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {greeting}, <span style={{ color: "var(--accent)" }}>{player.name}</span>
          </h1>
        </div>
      </header>

      <section aria-label="Comunicazioni Comitato" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="page-kicker">Comitato</p>
            <h2 className="text-lg font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
              Avvisi e messaggi
            </h2>
          </div>
          {hasCommitteeUpdates && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ background: "var(--wrong)", color: "#fff" }}>
              Da leggere
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/bacheca"
            className="action-card p-4 card-tap"
            style={{ "--card-accent": hasUnreadAnnouncements ? "var(--wrong)" : "var(--gold)" } as CSSProperties}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="micro-label">Avvisi Comitato</p>
                <p className="mt-2 text-base font-black leading-tight" style={{ fontFamily: "Outfit, sans-serif", color: hasUnreadAnnouncements ? "var(--wrong)" : "var(--gold)" }}>
                  {hasUnreadAnnouncements ? "Da leggere" : "Bacheca"}
                </p>
              </div>
              {hasUnreadAnnouncements && (
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "var(--wrong)", color: "#fff" }}>
                  {unreadAnnouncementCount}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {hasUnreadAnnouncements ? "Comunicazione di servizio da aprire." : "Comunicazioni ufficiali del Comitato."}
            </p>
          </Link>

          <Link
            to="/messaggi"
            className="action-card p-4 card-tap"
            style={{ "--card-accent": hasUnreadPrivateMessages ? "var(--wrong)" : "var(--accent)" } as CSSProperties}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="micro-label">Contatta Comitato</p>
                <p className="mt-2 text-base font-black leading-tight" style={{ fontFamily: "Outfit, sans-serif", color: hasUnreadPrivateMessages ? "var(--wrong)" : "var(--accent)" }}>
                  {hasUnreadPrivateMessages ? "Risposta ricevuta" : "Messaggi privati"}
                </p>
              </div>
              {hasUnreadPrivateMessages && (
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "var(--wrong)", color: "#fff" }}>
                  {unreadPrivateMessageCount}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {hasUnreadPrivateMessages ? "Risposta personale del Comitato da leggere." : "Scrivi per accesso, pagamento o schedina."}
            </p>
          </Link>
        </div>
      </section>

      {hasCommitteeUpdates && (
        <Link
          to={committeeAlertLink}
          className="block rounded-xl border p-4 shadow-lg transition-all card-tap"
          style={{
            borderColor: "rgba(255, 51, 102, 0.55)",
            background: "linear-gradient(135deg, rgba(255,51,102,0.22), rgba(255,215,0,0.12))",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--wrong)", fontFamily: "Outfit, sans-serif" }}>
                {committeeAlertLabel}
              </p>
              <p className="mt-1 text-lg font-black leading-tight" style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}>
                {committeeAlertTitle}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>
                {committeeAlertDetail}
              </p>
            </div>
            <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ background: "var(--wrong)", color: "#fff" }}>
              Apri
            </span>
          </div>
        </Link>
      )}

      <section className="surface-panel p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="micro-label">Stato schedina</p>
            <p className="text-2xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif", color: scheduleState.color }}>
              {scheduleState.label}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>{scheduleState.detail}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black" style={{ fontFamily: "Outfit, sans-serif", color: "var(--pitch)" }}>
              {completion}%
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {filledPredictions}/{totalMatches}
            </p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completion}%`,
              background: "linear-gradient(90deg, var(--accent), var(--pitch))",
            }}
          />
        </div>
        <Link
          to="/schedina"
          className="primary-action block w-full py-3 text-center text-sm font-black uppercase tracking-wider"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Apri schedina
        </Link>
      </section>

      {liveMatch && (
        <Link
          to="/schedina"
          className="glass rounded-lg p-4 flex items-center gap-3 card-tap animate-in"
          style={{ border: "1px solid rgba(255, 51, 102, 0.35)", background: "rgba(255, 51, 102, 0.06)" }}
        >
          <span
            className="live-badge px-2 py-0.5 rounded text-[10px] font-black shrink-0"
            style={{ fontFamily: "Outfit, sans-serif", background: "var(--wrong)", color: "white", letterSpacing: "0.1em" }}
          >
            LIVE
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black truncate flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Flag team={liveMatch.homeTeam} size={14} /> {liveMatch.homeTeam}
              <span style={{ color: "var(--text-muted)" }}>vs</span>
              {liveMatch.awayTeam} <Flag team={liveMatch.awayTeam} size={14} />
            </div>
            <div className="micro-label" style={{ color: "var(--wrong)" }}>Si sta giocando ora</div>
          </div>
        </Link>
      )}

      {!liveMatch && nextMatch && (
        <Link
          to="/schedina"
          className="glass rounded-lg p-4 flex items-center gap-3 card-tap animate-in"
          style={{ border: "1px solid rgba(0, 212, 255, 0.25)" }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent)", fontFamily: "Outfit, sans-serif", fontWeight: 900 }}>
            NEXT
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black truncate flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Flag team={nextMatch.homeTeam} size={14} /> {nextMatch.homeTeam}
              <span style={{ color: "var(--text-muted)" }}>vs</span>
              {nextMatch.awayTeam} <Flag team={nextMatch.awayTeam} size={14} />
            </div>
            <div className="micro-label" style={{ color: "var(--accent)" }}>
              Fra {formatCountdown(remainingMs)}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
