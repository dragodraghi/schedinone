import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ComparisonTable from "../components/ComparisonTable";
import EmptyState from "../components/EmptyState";
import { isScheduleCommitted, maskComparisonPlayers } from "../lib/comparisonVisibility";
import type { Game, Match, Player } from "../lib/types";

interface Props {
  game: Game;
  player: Player;
  players: Player[];
  matches: Match[];
}

const MAX_COMPARISON_PLAYERS = 4;

/**
 * Player-facing comparison: pick up to four accepted schedine and see them
 * side-by-side. The viewer's own row is always included with their real data
 * (even if still a draft) and highlighted. Anti-copy masking is applied so a
 * player who has not yet submitted cannot peek at other people's picks for
 * matches that are still open (see lib/comparisonVisibility).
 */
export default function ConfrontoPage({ game, player, players, matches }: Props) {
  const viewerCommitted = isScheduleCommitted(player.scheduleStatus);

  // Selectable list: everyone with an accepted schedina, plus the viewer
  // themselves (using their own real data, which may still be a draft).
  const selectablePlayers = useMemo(() => {
    const accepted = players.filter(
      (p) => p.scheduleStatus === "accettata" && p.id !== player.id
    );
    const withSelf = player.id ? [player, ...accepted] : accepted;
    return withSelf.sort((a, b) => b.points - a.points);
  }, [players, player]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(player.id ? [player.id] : [])
  );

  const selectedPlayers = selectablePlayers.filter((p) => selectedIds.has(p.id));
  const visiblePlayers = maskComparisonPlayers(
    selectedPlayers,
    matches,
    game,
    player.id,
    viewerCommitted
  );

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARISON_PLAYERS) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            Confronta squadre
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Scegli da 2 a 4 squadre e confronta le schedine.
          </p>
        </div>
        <Link
          to="/classifica"
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Classifica
        </Link>
      </div>

      {!viewerCommitted && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{
            background: "rgba(255, 215, 0, 0.08)",
            border: "1px solid rgba(255, 215, 0, 0.24)",
            color: "var(--text-primary)",
          }}
        >
          Finché non invii la tua schedina, degli altri giocatori vedi solo i
          pronostici delle partite già bloccate. La tua schedina la vedi sempre
          per intero.
        </div>
      )}

      {selectablePlayers.length === 0 ? (
        <EmptyState
          icon="VS"
          title="Ancora nessuna schedina da confrontare"
          description="Il confronto sarà disponibile appena ci saranno schedine accettate."
          accent="muted"
        />
      ) : (
        <>
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 600,
                }}
              >
                {selectedIds.size} selezionat{selectedIds.size === 1 ? "a" : "e"} di{" "}
                {selectablePlayers.length}
              </p>
              <button
                onClick={() => setSelectedIds(new Set(player.id ? [player.id] : []))}
                className="text-[10px] font-bold"
                style={{ color: "var(--text-muted)" }}
              >
                Azzera
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectablePlayers.map((p) => {
                const active = selectedIds.has(p.id);
                const disabled = !active && selectedIds.size >= MAX_COMPARISON_PLAYERS;
                const isSelf = p.id === player.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    disabled={disabled}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-45"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      background: active ? "rgba(0, 212, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      border: `1px solid ${active ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                      boxShadow: active ? "0 0 8px rgba(0,212,255,0.25)" : "none",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {active && "OK "}
                    {p.name}
                    {isSelf && <span className="ml-1 text-[9px]">★</span>}
                    <span
                      className="ml-1 text-[9px]"
                      style={{ color: active ? "var(--gold)" : "var(--text-muted)" }}
                    >
                      {p.points}pt
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {visiblePlayers.length < 2 ? (
            <EmptyState
              icon="VS"
              title={visiblePlayers.length === 0 ? "Scegli almeno 2 squadre" : "Aggiungine ancora una"}
              description="Il confronto ha senso con 2 o più squadre, fino a un massimo di 4 alla volta."
              accent="blue"
            />
          ) : (
            <ComparisonTable
              players={visiblePlayers}
              matches={matches}
              game={game}
              highlightId={player.id}
            />
          )}
        </>
      )}
    </div>
  );
}
