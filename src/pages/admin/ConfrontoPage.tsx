import { useState } from "react";
import { Link } from "react-router-dom";
import ComparisonTable from "../../components/ComparisonTable";
import EmptyState from "../../components/EmptyState";
import type { Game, Player, Match } from "../../lib/types";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
}

/**
 * Admin supervision: select any N players and compare them side-by-side.
 * Unlike the player's Profilo Confronto, there's no "self" column — the
 * admin account doesn't play.
 */
export default function ConfrontoPage({ game, players, matches }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Default to all accepted players if no selection
  const allPlayers = [...players].sort((a, b) => b.points - a.points);
  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            ⚔️ Confronto Giocatori
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Seleziona due o più giocatori e confronta le statistiche
          </p>
        </div>
        <Link
          to="/admin"
          className="text-xs transition-colors px-3 py-1.5 rounded-lg glass shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          ← Admin
        </Link>
      </div>

      {allPlayers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nessun giocatore iscritto"
          description="Appena i giocatori entreranno, potrai confrontarli qui."
          accent="muted"
        />
      ) : (
        <>
          {/* Selector */}
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
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
                  onClick={() => setSelectedIds(new Set(allPlayers.map((p) => p.id)))}
                  className="text-[10px] font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  Tutti
                </button>
                <button
                  onClick={() =>
                    setSelectedIds(new Set(allPlayers.slice(0, 5).map((p) => p.id)))
                  }
                  className="text-[10px] font-bold"
                  style={{ color: "var(--gold)" }}
                >
                  Top 5
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
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      background: active
                        ? "rgba(0, 212, 255, 0.2)"
                        : "rgba(255, 255, 255, 0.05)",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      border: `1px solid ${active ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                      boxShadow: active ? "0 0 8px rgba(0,212,255,0.25)" : "none",
                    }}
                  >
                    {active && "✓ "}
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
              icon="⚔️"
              title={selectedPlayers.length === 0 ? "Scegli almeno 2 giocatori" : "Aggiungine ancora uno"}
              description="Il confronto ha senso con 2 o più giocatori. Tocca i nomi sopra per includerli."
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
