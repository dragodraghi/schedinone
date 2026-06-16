import { isMatchClosedForPredictions } from "./scheduleRules";
import type { Game, Match, Player } from "./types";

/**
 * A schedule that can still be edited (bozza/rifiutata) is the only situation
 * where a player could copy other people's accepted predictions before
 * committing their own. Once a schedule is "inviata" or "accettata" it can no
 * longer be changed (see functions/src/saveSchedule.ts), so there is nothing
 * to gain from peeking.
 */
export function isScheduleCommitted(status: Player["scheduleStatus"]): boolean {
  return status === "inviata" || status === "accettata";
}

/**
 * Anti-copy masking for the player-facing Confronto.
 *
 * - If the viewer's own schedule is already committed, they cannot copy
 *   anyone, so everyone's data is shown as-is.
 * - Otherwise (viewer still in bozza/rifiutata) every OTHER player's data is
 *   reduced to what is already locked: only predictions for matches that are
 *   closed for editing survive, and the tournament-long special picks
 *   (capocannoniere / vincitrice) are hidden. The viewer's own row is never
 *   masked, so they always see their full schedina.
 *
 * Points and per-phase breakdowns are derived elsewhere only from matches that
 * already have a result (hence already closed), so masking never affects them.
 */
export function maskComparisonPlayers(
  players: Player[],
  matches: Match[],
  game: Game,
  viewerId: string,
  viewerCommitted: boolean,
  now: Date = new Date()
): Player[] {
  if (viewerCommitted) return players;

  const matchById = new Map(matches.map((match) => [match.id, match]));

  return players.map((player) => {
    if (player.id === viewerId) return player;

    const visiblePredictions: Player["predictions"] = {};
    for (const [matchId, sign] of Object.entries(player.predictions)) {
      const match = matchById.get(matchId);
      if (match && isMatchClosedForPredictions(game, match, now)) {
        visiblePredictions[matchId] = sign;
      }
    }

    return {
      ...player,
      predictions: visiblePredictions,
      topScorerPick: "",
      winnerPick: "",
    };
  });
}
