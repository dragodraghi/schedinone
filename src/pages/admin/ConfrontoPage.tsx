import { useState } from "react";
import { Link } from "react-router-dom";
import ComparisonTable from "../../components/ComparisonTable";
import EmptyState from "../../components/EmptyState";
import type { Game, Match, Player } from "../../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
}

const MAX_COMPARISON_PLAYERS = 4;

/**
 * Admin supervision: select up to four players and compare them side-by-side.
 * Unlike the player's Profilo Confronto, there is no "self" column: the
 * admin account does not play.
 */
export default function ConfrontoPage({ game, players, matches }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allPlayers = [...players].sort((a, b) => b.points - a.points);
  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            Confronto Giocatori
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Seleziona da 2 a massimo 4 squadre contemporaneamente.
          </p>
        </div>
        <Link
          to="/admin"
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          Admin
        </Link>
      </div>

      {allPlayers.length === 0 ? (
        <EmptyState
          icon="VS"
          title="Nessun giocatore iscritto"
          description="Appena i giocatori entreranno, potrai confrontarli qui."
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
                {selectedIds.size} selezionat{selectedIds.size === 1 ? "o" : "i"} di {allPlayers.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedIds(new Set(allPlayers.slice(0, MAX_COMPARISON_PLAYERS).map((p) => p.id)))
                  }
                  className="text-[10px] font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  Top 4
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[10px] font-bold"
                  style={{ color: "var(--text-muted)" }}
                >
                  Nessuno
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allPlayers.map((p) => {
                const active = selectedIds.has(p.id);
                const disabled = !active && selectedIds.size >= MAX_COMPARISON_PLAYERS;
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

          {selectedPlayers.length < 2 ? (
            <EmptyState
              icon="VS"
              title={selectedPlayers.length === 0 ? "Scegli almeno 2 giocatori" : "Aggiungine ancora uno"}
              description="Il confronto ha senso con 2 o piu giocatori, fino a un massimo di 4 squadre alla volta."
              accent="blue"
            />
          ) : (
            <ComparisonTable players={selectedPlayers} matches={matches} game={game} />
          )}
        </>
      )}
    </div>
  );
}
