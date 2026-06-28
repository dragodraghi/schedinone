import { Link } from "react-router-dom";
import PlayerRow from "../components/PlayerRow";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { getTopPlayers, rankPlayersForLeaderboard } from "../lib/playerOrdering";
import type { Game, Player } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  loading?: boolean;
  title?: string;
  kicker?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showCompareLink?: boolean;
}

export default function ClassificaPage({
  game,
  player,
  players,
  loading = false,
  title = "Classifica",
  kicker = "Punti torneo",
  emptyTitle = "Nessun giocatore iscritto",
  emptyDescription = "Appena i primi giocatori entreranno con il codice, li vedrai comparire qui.",
  showCompareLink = true,
}: Props) {
  const paidCount = players.filter((p) => p.paid).length;
  const prize = game.entryFee * paidCount;
  const topPlayers = getTopPlayers(players);
  const rankedPlayers = rankPlayersForLeaderboard(players);
  const leader = topPlayers[0];
  const hasTiedLeaders = topPlayers.length > 1;
  const leaderTitle = !leader
    ? "Classifica vuota"
    : hasTiedLeaders
    ? `${topPlayers.length} pari merito`
    : leader.name;
  const leaderSubtitle = !leader
    ? "I punti compariranno dopo i risultati"
    : hasTiedLeaders
    ? `${leader.points} punti ciascuno`
    : `${leader.points} punti`;

  return (
    <div className="space-y-5 animate-in">
      <header className="page-head">
        <div>
          <p className="page-kicker">{kicker}</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h1>
        </div>
        <div className="counter-pill px-3 py-2 rounded-lg text-xs">
          <span style={{ color: "var(--accent)" }}>{players.length}</span>
          <span style={{ color: "var(--text-muted)" }}> giocatori</span>
        </div>
      </header>

      <section className="surface-panel p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="micro-label">In testa</p>
          <p className="text-xl font-black truncate mt-1" style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}>
            {leaderTitle}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {leaderSubtitle}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="micro-label">Montepremi</p>
          <p className="text-2xl font-black shimmer mt-1" style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}>
            EUR {prize}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {paidCount} x EUR {game.entryFee}
          </p>
        </div>
      </section>

      {showCompareLink && players.length > 0 && (
        <Link
          to="/confronto"
          className="secondary-action flex items-center justify-center w-full px-4"
          style={{ borderColor: "rgba(0,212,255,0.28)", color: "var(--accent)" }}
        >
          Confronta squadre
        </Link>
      )}

      <div className="space-y-2">
        {rankedPlayers.map(({ player: p, rank }) => (
          <PlayerRow key={p.id} rank={rank} name={p.name} points={p.points} previousRank={p.previousRank} isCurrentUser={p.id === player.id} />
        ))}
      </div>

      {loading && players.length === 0 && (
        <div className="space-y-2" aria-busy="true" aria-label="Caricamento classifica">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={56} rounded="0.75rem" />
          ))}
        </div>
      )}

      {!loading && players.length === 0 && (
        <EmptyState
          icon="Trophy"
          title={emptyTitle}
          description={emptyDescription}
          accent="muted"
        />
      )}
    </div>
  );
}
