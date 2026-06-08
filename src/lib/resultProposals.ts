import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import type { Sign } from "./types";

export type ResultProposalStatus = "pending" | "confirmed" | "ignored";

export interface ResultProposal {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  result: Sign;
  status: ResultProposalStatus;
  source: string;
  fixtureId?: number;
  apiStatus?: string;
  fetchedAt: Timestamp | null;
}

export interface FetchResultProposalsReport {
  configured: boolean;
  proposalsUpdated: number;
  gamesScanned: number;
  matchesScanned: number;
  message: string;
}

type FetchResultProposalsResponse = Partial<Record<keyof FetchResultProposalsReport, unknown>>;

function isSign(value: unknown): value is Sign {
  return value === "1" || value === "X" || value === "2";
}

function toResultProposal(id: string, data: Record<string, unknown>): ResultProposal | null {
  if (
    typeof data.matchId !== "string" ||
    typeof data.homeTeam !== "string" ||
    typeof data.awayTeam !== "string" ||
    typeof data.score !== "string" ||
    !isSign(data.result)
  ) {
    return null;
  }

  const status =
    data.status === "confirmed" || data.status === "ignored" ? data.status : "pending";

  return {
    id,
    matchId: data.matchId,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    score: data.score,
    result: data.result,
    status,
    source: typeof data.source === "string" ? data.source : "api-football",
    fixtureId: Number.isFinite(Number(data.fixtureId)) ? Number(data.fixtureId) : undefined,
    apiStatus: typeof data.apiStatus === "string" ? data.apiStatus : undefined,
    fetchedAt: (data.fetchedAt as Timestamp | null | undefined) ?? null,
  };
}

export function subscribeResultProposals(
  gameId: string,
  onData: (proposals: ResultProposal[]) => void
) {
  return onSnapshot(
    collection(db, "games", gameId, "resultProposals"),
    (snap) => {
      onData(
        snap.docs
          .map((docSnap) => toResultProposal(docSnap.id, docSnap.data()))
          .filter((proposal): proposal is ResultProposal => proposal !== null)
          .filter((proposal) => proposal.status === "pending")
      );
    },
    (err) => {
      console.error("Result proposals subscription error:", err);
      onData([]);
    }
  );
}

export async function fetchResultProposalsNow(gameId: string): Promise<FetchResultProposalsReport> {
  const callable = httpsCallable<{ gameId: string }, FetchResultProposalsResponse>(
    functions,
    "fetchResultProposalsNow"
  );
  const result = await callable({ gameId });
  const data = result.data ?? {};

  return {
    configured: data.configured === true,
    proposalsUpdated: Number.isFinite(Number(data.proposalsUpdated))
      ? Number(data.proposalsUpdated)
      : 0,
    gamesScanned: Number.isFinite(Number(data.gamesScanned)) ? Number(data.gamesScanned) : 0,
    matchesScanned: Number.isFinite(Number(data.matchesScanned))
      ? Number(data.matchesScanned)
      : 0,
    message: typeof data.message === "string" ? data.message : "",
  };
}
