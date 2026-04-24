import React, { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Game, Player, Match } from "../../lib/types";
import Flag from "../../components/Flag";
import Toast, { type ToastData } from "../../components/Toast";
import { exportElementAsPdf, timestampSlug } from "../../lib/pdfExport";
import { vibrate } from "../../lib/haptic";

interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
  currentPlayer?: Player;
}

interface Section {
  key: string;
  label: string;
  order: number;
}

const BG_DEEP = "#040810";
const BG_CARD = "rgba(15, 23, 42, 1)";
const PHASE_ORDER: Record<string, number> = {
  gironi: 0,
  ottavi: 1,
  quarti: 2,
  semifinali: 3,
  finale: 4,
};

function getSection(match: Match): Section {
  if (match.phase === "gironi" && match.group) {
    return {
      key: `group:${match.group}`,
      label: `Gruppo ${match.group}`,
      order: match.group.charCodeAt(0),
    };
  }

  return {
    key: `phase:${match.phase}`,
    label: match.phase.charAt(0).toUpperCase() + match.phase.slice(1),
    order: 100 + (PHASE_ORDER[match.phase] ?? 99),
  };
}

export default function RiepilogoPage({ game, players, matches, currentPlayer }: Props) {
  const [sectionFilter, setSectionFilter] = useState<string>("Tutti");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const isPlayerView = !!currentPlayer;

  const handleExportPdf = async () => {
    if (!tableContainerRef.current) return;
    setExportingPdf(true);
    vibrate("tap");
    try {
      const container = tableContainerRef.current;
      const prevMaxHeight = container.style.maxHeight;
      const prevOverflow = container.style.overflow;
      container.style.maxHeight = "none";
      container.style.overflow = "visible";

      const orientation = players.length > 6 ? "landscape" : "portrait";
      await exportElementAsPdf(container, {
        filename: `griglione-schedinone-${timestampSlug()}.pdf`,
        orientation,
      });

      container.style.maxHeight = prevMaxHeight;
      container.style.overflow = prevOverflow;
      setToast({ message: "Griglione scaricato!", type: "success" });
    } catch (err) {
      console.error("PDF export error:", err);
      setToast({ message: "Errore nel download del PDF", type: "error" });
    } finally {
      setExportingPdf(false);
    }
  };

  const sections = useMemo(() => {
    const byKey = new Map<string, Section>();
    matches.forEach((match) => {
      const section = getSection(match);
      if (!byKey.has(section.key)) {
        byKey.set(section.key, section);
      }
    });
    return Array.from(byKey.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [matches]);

  const visiblePlayers = useMemo(() => {
    if (isPlayerView) {
      return players.filter((p) => p.scheduleStatus === "accettata");
    }
    return players;
  }, [players, isPlayerView]);

  const sortedPlayers = useMemo(
    () => [...visiblePlayers].sort((a, b) => b.points - a.points),
    [visiblePlayers]
  );

  const filteredMatches = useMemo(() => {
    if (sectionFilter === "Tutti") return matches;
    return matches.filter((match) => getSection(match).key === sectionFilter);
  }, [matches, sectionFilter]);

  const matchesBySection = useMemo(() => {
    const grouped: Record<string, { label: string; matches: Match[] }> = {};
    filteredMatches.forEach((match) => {
      const section = getSection(match);
      if (!grouped[section.key]) {
        grouped[section.key] = { label: section.label, matches: [] };
      }
      grouped[section.key].matches.push(match);
    });
    Object.values(grouped).forEach((entry) =>
      entry.matches.sort((a, b) => (a.kickoff?.getTime?.() ?? 0) - (b.kickoff?.getTime?.() ?? 0))
    );
    return grouped;
  }, [filteredMatches]);

  const sortedSectionKeys = useMemo(
    () =>
      sections
        .map((section) => section.key)
        .filter((key) => key in matchesBySection),
    [sections, matchesBySection]
  );

  function cellStyle(player: Player, match: Match): React.CSSProperties {
    const prediction = player.predictions[match.id];
    if (!prediction) return {};
    if (!match.result) return { background: "rgba(0, 212, 255, 0.12)" };
    if (prediction === match.result) return { background: "rgba(0, 255, 136, 0.15)" };
    return { background: "rgba(255, 51, 102, 0.15)" };
  }

  function cellText(player: Player, match: Match): { text: string; color: string } {
    const prediction = player.predictions[match.id];
    if (!prediction) return { text: "—", color: "var(--text-muted)" };
    if (!match.result) return { text: prediction, color: "var(--accent)" };
    if (prediction === match.result) return { text: prediction, color: "var(--correct)" };
    return { text: prediction, color: "var(--wrong)" };
  }

  const totalCols = 2 + sortedPlayers.length;

  return (
    <div className="space-y-4 animate-in">
      <Toast toast={toast} onDone={() => setToast(null)} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
            {isPlayerView ? "📊 Griglione" : "📊 Riepilogo Schedine"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sortedPlayers.length} giocatori · {matches.length} partite
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || sortedPlayers.length === 0}
            className="text-xs transition-all px-3 py-1.5 rounded-lg glass"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: exportingPdf ? "var(--text-muted)" : "var(--gold)",
              borderColor: "rgba(255,215,0,0.4)",
              opacity: exportingPdf ? 0.6 : 1,
            }}
            title="Scarica il griglione in PDF"
          >
            {exportingPdf ? "..." : "📄 PDF"}
          </button>
          <Link
            to={isPlayerView ? "/" : "/admin"}
            className="text-xs transition-colors px-3 py-1.5 rounded-lg glass"
            style={{ color: "var(--text-muted)" }}
          >
            {isPlayerView ? "← Home" : "← Admin"}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["Tutti", ...sections.map((section) => section.key)].map((key) => {
          const section = sections.find((item) => item.key === key);
          const label = key === "Tutti" ? "Tutti" : section?.label ?? key;
          return (
            <button
              key={key}
              onClick={() => setSectionFilter(key)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                background:
                  sectionFilter === key
                    ? "rgba(0, 212, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                color: sectionFilter === key ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${sectionFilter === key ? "rgba(0,212,255,0.4)" : "var(--border)"}`,
                boxShadow: sectionFilter === key ? "0 0 8px rgba(0,212,255,0.25)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        ref={tableContainerRef}
        className="glass rounded-xl"
        style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}
      >
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: "100%",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 30,
                  background: BG_CARD,
                  borderBottom: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  padding: "8px 10px",
                  textAlign: "left",
                  minWidth: 140,
                  maxWidth: 180,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
                >
                  Partita
                </span>
              </th>
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  left: 140,
                  zIndex: 30,
                  background: BG_CARD,
                  borderBottom: "1px solid var(--border)",
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  padding: "8px 8px",
                  textAlign: "center",
                  minWidth: 44,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
                >
                  Ris.
                </span>
              </th>
              {sortedPlayers.map((player) => {
                const isMe = currentPlayer?.id === player.id;
                return (
                  <th
                    key={player.id}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 20,
                      background: isMe ? "rgba(0,212,255,0.08)" : BG_CARD,
                      borderBottom: isMe ? "2px solid rgba(0,212,255,0.5)" : "1px solid var(--border)",
                      borderRight: "1px solid var(--border)",
                      padding: "6px 6px",
                      textAlign: "center",
                      minWidth: 52,
                      maxWidth: 72,
                      boxShadow: isMe ? "0 0 12px rgba(0,212,255,0.15)" : "none",
                    }}
                  >
                    <div
                      className="text-[11px] font-bold truncate"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        color: isMe ? "var(--accent)" : "var(--text-primary)",
                        maxWidth: 64,
                      }}
                      title={player.name}
                    >
                      {player.name.split(" ")[0]}
                      {isMe && <span className="ml-0.5 text-[8px]">★</span>}
                    </div>
                    <div
                      className="text-[10px] font-black"
                      style={{ color: "var(--gold)" }}
                    >
                      {player.points}pt
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedSectionKeys.map((sectionKey) => (
              <React.Fragment key={sectionKey}>
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{
                      background: "rgba(0, 212, 255, 0.06)",
                      borderBottom: "1px solid rgba(0,212,255,0.15)",
                      borderTop: "1px solid rgba(0,212,255,0.15)",
                      padding: "5px 12px",
                    }}
                  >
                    <span
                      className="group-header text-[10px] uppercase tracking-widest"
                      style={{ color: "var(--accent)" }}
                    >
                      {matchesBySection[sectionKey].label}
                    </span>
                  </td>
                </tr>

                {matchesBySection[sectionKey].matches.map((match) => (
                  <tr
                    key={match.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 10,
                        background: BG_DEEP,
                        borderRight: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        padding: "5px 10px",
                        minWidth: 140,
                        maxWidth: 180,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        className="text-[11px] font-medium flex items-center gap-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Flag team={match.homeTeam} size={12} />
                        <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 10 }}>
                          {match.homeTeam}
                        </span>
                      </div>
                      <div
                        className="text-[11px] font-medium flex items-center gap-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Flag team={match.awayTeam} size={12} />
                        <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 10 }}>
                          {match.awayTeam}
                        </span>
                      </div>
                    </td>

                    <td
                      style={{
                        position: "sticky",
                        left: 140,
                        zIndex: 10,
                        background: BG_DEEP,
                        borderRight: "2px solid rgba(0,212,255,0.25)",
                        borderBottom: "1px solid var(--border)",
                        padding: "5px 8px",
                        textAlign: "center",
                        minWidth: 44,
                      }}
                    >
                      {match.result ? (
                        <span
                          className="text-xs font-black"
                          style={{
                            fontFamily: "Outfit, sans-serif",
                            color: "var(--accent)",
                            background: "rgba(0,212,255,0.12)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {match.result}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>

                    {sortedPlayers.map((player) => {
                      const { text, color } = cellText(player, match);
                      const style = cellStyle(player, match);
                      const isMe = currentPlayer?.id === player.id;
                      return (
                        <td
                          key={player.id}
                          style={{
                            ...style,
                            borderRight: "1px solid var(--border)",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: isMe ? "1px solid rgba(0,212,255,0.3)" : undefined,
                            padding: "4px 6px",
                            textAlign: "center",
                            minWidth: 52,
                            background: isMe && !style.background ? "rgba(0,212,255,0.04)" : style.background,
                          }}
                        >
                          <span
                            className="text-xs font-black"
                            style={{ fontFamily: "Outfit, sans-serif", color }}
                          >
                            {text}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}

            <tr>
              <td
                colSpan={totalCols}
                style={{
                  background: "rgba(255, 215, 0, 0.06)",
                  borderBottom: "1px solid rgba(255,215,0,0.2)",
                  borderTop: "2px solid rgba(255,215,0,0.25)",
                  padding: "5px 12px",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  Pronostici Speciali
                </span>
              </td>
            </tr>

            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "6px 10px",
                  minWidth: 140,
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  className="text-[11px] font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  ⚽ Capocannoniere
                </div>
                {game.topScorer && (
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Risposta: {game.topScorer}
                  </div>
                )}
              </td>
              <td
                style={{
                  position: "sticky",
                  left: 140,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  borderBottom: "1px solid var(--border)",
                  padding: "5px 8px",
                  textAlign: "center",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
              </td>
              {sortedPlayers.map((player) => {
                const pick = player.topScorerPick || "—";
                const isCorrect = game.topScorer && player.topScorerPick && player.topScorerPick === game.topScorer;
                const isWrong = game.topScorer && player.topScorerPick && player.topScorerPick !== game.topScorer;
                const bgStyle = isCorrect
                  ? { background: "rgba(0,255,136,0.15)" }
                  : isWrong
                  ? { background: "rgba(255,51,102,0.15)" }
                  : {};
                const color = isCorrect
                  ? "var(--correct)"
                  : isWrong
                  ? "var(--wrong)"
                  : pick === "—"
                  ? "var(--text-muted)"
                  : "var(--text-primary)";
                return (
                  <td
                    key={player.id}
                    style={{
                      ...bgStyle,
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      padding: "4px 4px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium"
                      style={{ color }}
                      title={pick}
                    >
                      {pick.length > 8 ? pick.slice(0, 7) + "…" : pick}
                    </span>
                  </td>
                );
              })}
            </tr>

            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "6px 10px",
                  minWidth: 140,
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  className="text-[11px] font-black"
                  style={{ fontFamily: "Outfit, sans-serif", color: "var(--gold)" }}
                >
                  🏆 Vincitrice
                </div>
                {game.winner && (
                  <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <Flag team={game.winner} size={10} /> {game.winner}
                  </div>
                )}
              </td>
              <td
                style={{
                  position: "sticky",
                  left: 140,
                  zIndex: 10,
                  background: BG_DEEP,
                  borderRight: "2px solid rgba(0,212,255,0.25)",
                  borderBottom: "1px solid var(--border)",
                  padding: "5px 8px",
                  textAlign: "center",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
              </td>
              {sortedPlayers.map((player) => {
                const pick = player.winnerPick || "—";
                const isCorrect = game.winner && player.winnerPick && player.winnerPick === game.winner;
                const isWrong = game.winner && player.winnerPick && player.winnerPick !== game.winner;
                const bgStyle = isCorrect
                  ? { background: "rgba(0,255,136,0.15)" }
                  : isWrong
                  ? { background: "rgba(255,51,102,0.15)" }
                  : {};
                const color = isCorrect
                  ? "var(--correct)"
                  : isWrong
                  ? "var(--wrong)"
                  : pick === "—"
                  ? "var(--text-muted)"
                  : "var(--text-primary)";
                return (
                  <td
                    key={player.id}
                    style={{
                      ...bgStyle,
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      padding: "4px 4px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      className="text-[10px] font-medium inline-flex items-center gap-0.5"
                      style={{ color }}
                      title={pick}
                    >
                      {pick === "—" ? (
                        "—"
                      ) : (
                        <>
                          <Flag team={pick} size={10} />
                          {pick.length > 6 ? pick.slice(0, 5) + "…" : pick}
                        </>
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
