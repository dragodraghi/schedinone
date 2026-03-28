export type Sign = "1" | "X" | "2";

export type Phase = "gironi" | "ottavi" | "quarti" | "semifinali" | "finale";

export interface Game {
  id: string;
  name: string;
  entryFee: number;
  admins: string[];
  adminCode: string;
  accessCode: string;
  phases: Phase[];
  currentPhase: Phase;
  topScorer: string | null;
  winner: string | null;
}

export interface Match {
  id: string;
  phase: Phase;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  result: Sign | null;
  score: string | null;
  locked: boolean;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: Date;
  predictions: Record<string, Sign>;
  topScorerPick: string;
  winnerPick: string;
  points: number;
  paid: boolean;
}
