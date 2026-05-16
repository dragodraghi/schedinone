import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Flag from "../components/Flag";
import { getNextMatch, formatCountdown, getMatchStatus } from "../lib/matchStatus";
import type { Game, Player, Match } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
}

export default function DashboardPage({ game, player, players, matches }: Props) {
  // Only count matches of the CURRENT phase for the "X/Y pronostici" counter.
  // Otherwise, once we advance from gironi to ottavi, the counter includes
  // stale predictions for deleted/replaced matches and shows nonsense.
  const phaseMatches = matches.filter((m) => m.phase === game.currentPhase);
  const totalMatches = phaseMatches.length;
  const filledPredictions = phaseMatches.filter((m) => player.predictions[m.id]).length;
  const rank = players.findIndex((p) => p.id === player.id) + 1;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  // Countdown tick — update every 30s
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const liveMatch = matches.find((m) => getMatchStatus(m, now) === "live");
  const nextMatch = getNextMatch(matches, now);
  const remainingMs = nextMatch?.kickoff ? nextMatch.kickoff.getTime() - now.getTime() : 0;
  const missingPredictions = Math.max(totalMatches - filledPredictions, 0);
  const scheduleState = {
    bozza: {
      label: "Da completare",
      detail: missingPredictions > 0 ? `Mancano ${missingPredictions}` : "Pronta da inviare",
      color: "var(--accent)",
    },
    inviata: {
      label: "Inviata",
      detail: "In attesa del Comitato",
      color: "var(--accent)",
    },
    accettata: {
      label: "Accettata",
      detail: "Visibile nel Griglione",
      color: "var(--correct)",
    },
    rifiutata: {
      label: "Da correggere",
      detail: "Modifica e reinvia",
      color: "var(--wrong)",
    },
  }[player.scheduleStatus];
  const rankText = rank > 0 ? `${rank}°/${players.length}` : `-/${players.length}`;

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>{player.name}</span>!
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {filledPredictions}/{totalMatches} pronostici inseriti
          </p>
        </div>
        <Link
          to="/profilo"
          aria-label="Apri profilo"
          className="counter-pill px-3 py-2 rounded-xl text-center transition-all card-tap"
        >
          <div className="text-lg" aria-hidden="true">👤</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>profilo</div>
        </Link>
      </div>

      {/* Essential state */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/schedina"
          className="glass rounded-xl p-4 card-tap col-span-2 sm:col-span-1"
          style={{ borderColor: scheduleState.color }}
        >
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Stato schedina
          </p>
          <p className="text-xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: scheduleState.color }}>
            {scheduleState.label}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{scheduleState.detail}</p>
        </Link>

        <Link to="/classifica" className="glass rounded-xl p-4 card-tap">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Classifica
          </p>
          <p className="text-xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--gold)' }}>
            {rankText}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{player.points} punti</p>
        </Link>

        <Link to="/griglione" className="glass rounded-xl p-4 card-tap">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
            Griglione
          </p>
          <p className="text-xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>
            Apri
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Pronostici accettati</p>
        </Link>
      </div>

      {/* LIVE or next-match strip */}
      {liveMatch && (
        <Link
          to="/schedina"
          className="glass rounded-xl p-4 flex items-center gap-3 card-tap animate-in"
          style={{ border: '1px solid rgba(255, 51, 102, 0.35)', background: 'rgba(255, 51, 102, 0.06)' }}
        >
          <span
            className="live-badge px-2 py-0.5 rounded text-[10px] font-black shrink-0"
            style={{ fontFamily: 'Outfit, sans-serif', background: 'var(--wrong)', color: 'white', letterSpacing: '0.1em' }}
          >
            LIVE
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black truncate flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Flag team={liveMatch.homeTeam} size={14} /> {liveMatch.homeTeam}
              <span style={{ color: 'var(--text-muted)' }}>vs</span>
              {liveMatch.awayTeam} <Flag team={liveMatch.awayTeam} size={14} />
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--wrong)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              Si sta giocando ora
            </div>
          </div>
        </Link>
      )}
      {!liveMatch && nextMatch && (
        <Link
          to="/schedina"
          className="glass rounded-xl p-4 flex items-center gap-3 card-tap animate-in"
          style={{ border: '1px solid rgba(0, 212, 255, 0.25)' }}
        >
          <span className="text-2xl shrink-0" aria-hidden="true">⏱️</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black truncate flex items-center gap-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Flag team={nextMatch.homeTeam} size={14} /> {nextMatch.homeTeam}
              <span style={{ color: 'var(--text-muted)' }}>vs</span>
              {nextMatch.awayTeam} <Flag team={nextMatch.awayTeam} size={14} />
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent)', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              Prossima partita fra {formatCountdown(remainingMs)}
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
