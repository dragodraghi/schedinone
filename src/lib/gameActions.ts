import { FirebaseError } from "firebase/app";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";
import type { Game, ScheduleStatus, Sign } from "./types";

interface JoinGamePayload {
  gameId: string;
  name: string;
  code: string;
}

interface JoinGameResult {
  createdPlayer: boolean;
  isAdmin: boolean;
}

interface SaveSchedulePayload {
  gameId: string;
  predictions: Record<string, Sign>;
  topScorerPick: string;
  winnerPick: string;
  submit?: boolean;
}

interface SaveScheduleResult {
  scheduleStatus: "bozza" | "rifiutata" | "inviata";
}

const FALLBACK_FUNCTION_CODES = new Set([
  "functions/internal",
  "functions/not-found",
  "functions/unavailable",
  "functions/unimplemented",
]);
const SIGN_SET = new Set<Sign>(["1", "X", "2"]);
const MAX_PICK_LEN = 40;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function shouldFallbackToDirectFirestore(error: unknown): boolean {
  return error instanceof FirebaseError && FALLBACK_FUNCTION_CODES.has(error.code);
}

function requireUid(): string {
  const uid = auth.currentUser?.uid ?? "";
  if (!uid) {
    throw new FirebaseError("functions/unauthenticated", "Devi essere autenticato.");
  }
  return uid;
}

function sanitizePick(value: unknown): string {
  const normalized = normalizeText(value);
  if (normalized.length > MAX_PICK_LEN) {
    throw new FirebaseError("functions/invalid-argument", "Dati schedina non validi.");
  }
  return normalized;
}

function sanitizePredictions(raw: unknown): Record<string, Sign> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const predictions: Record<string, Sign> = {};
  for (const [matchId, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedId = normalizeText(matchId);
    if (!normalizedId || !SIGN_SET.has(String(value) as Sign)) {
      throw new FirebaseError("functions/invalid-argument", "Dati schedina non validi.");
    }
    predictions[normalizedId] = value as Sign;
  }

  return predictions;
}

async function joinGameDirect(payload: JoinGamePayload): Promise<JoinGameResult> {
  const uid = requireUid();
  const name = normalizeText(payload.name);
  const code = normalizeText(payload.code);

  if (!payload.gameId || !name || !code || name.length > 30 || code.length > 60) {
    throw new FirebaseError("functions/invalid-argument", "Inserisci nome e codice validi.");
  }

  const gameRef = doc(db, "games", payload.gameId);
  const playerRef = doc(db, "games", payload.gameId, "players", uid);

  const [gameSnap, playerSnap, playersSnap] = await Promise.all([
    getDoc(gameRef),
    getDoc(playerRef),
    getDocs(collection(db, "games", payload.gameId, "players")),
  ]);

  if (!gameSnap.exists()) {
    throw new FirebaseError("functions/not-found", "Gioco non trovato.");
  }

  const gameData = gameSnap.data() as Partial<Game>;
  const accessAllowed = normalizeText(gameData.accessCode) === code;
  const adminAllowed = normalizeText(gameData.adminCode) === code;

  if (!accessAllowed && !adminAllowed) {
    throw new FirebaseError("functions/permission-denied", "Codice non valido.");
  }

  if (!playerSnap.exists()) {
    const normalizedName = name.toLowerCase();
    const duplicate = playersSnap.docs.find((playerDoc) => {
      if (playerDoc.id === uid) return false;
      return normalizeText(playerDoc.data().name).toLowerCase() === normalizedName;
    });

    if (duplicate) {
      throw new FirebaseError(
        "functions/failed-precondition",
        `Il nome "${name}" e' gia' usato. Scegli un nome diverso o chiedi al Comitato di rimuovere quello vecchio.`
      );
    }
  }

  let createdPlayer = false;
  if (!playerSnap.exists()) {
    await setDoc(playerRef, {
      name,
      nameLower: name.toLowerCase(),
      joinedAt: serverTimestamp(),
      predictions: {},
      topScorerPick: "",
      winnerPick: "",
      points: 0,
      paid: false,
      scheduleStatus: "bozza",
    });
    createdPlayer = true;
  }

  const admins = Array.isArray(gameData.admins)
    ? gameData.admins.filter((value): value is string => typeof value === "string")
    : [];
  const alreadyAdmin = admins.includes(uid);

  if (adminAllowed && !alreadyAdmin) {
    await updateDoc(gameRef, { admins: arrayUnion(uid) });
  }

  return {
    createdPlayer,
    isAdmin: alreadyAdmin || adminAllowed,
  };
}

async function saveScheduleDirect(payload: SaveSchedulePayload): Promise<SaveScheduleResult> {
  const uid = requireUid();
  const predictions = sanitizePredictions(payload.predictions);
  const topScorerPick = sanitizePick(payload.topScorerPick);
  const winnerPick = sanitizePick(payload.winnerPick);
  const playerRef = doc(db, "games", payload.gameId, "players", uid);

  const [gameSnap, playerSnap, matchesSnap] = await Promise.all([
    getDoc(doc(db, "games", payload.gameId)),
    getDoc(playerRef),
    getDocs(collection(db, "games", payload.gameId, "matches")),
  ]);

  if (!gameSnap.exists() || !playerSnap.exists()) {
    throw new FirebaseError("functions/not-found", "Giocatore o gioco non trovato.");
  }

  const gameData = gameSnap.data() as Partial<Game>;
  const playerData = playerSnap.data();
  const currentStatus = normalizeText(playerData.scheduleStatus) || "bozza";
  if (currentStatus !== "bozza" && currentStatus !== "rifiutata") {
    throw new FirebaseError("functions/failed-precondition", "La schedina non e' piu' modificabile.");
  }

  const currentPhase = normalizeText(gameData.currentPhase);
  if (!currentPhase) {
    throw new FirebaseError("functions/failed-precondition", "Fase corrente non configurata.");
  }

  const phaseMatches = matchesSnap.docs.filter(
    (matchDoc) => normalizeText(matchDoc.data().phase) === currentPhase
  );
  const phaseClosed = phaseMatches.some((matchDoc) => {
    const matchData = matchDoc.data();
    return matchData.locked === true || matchData.result !== null;
  });
  if (phaseClosed) {
    throw new FirebaseError(
      "functions/failed-precondition",
      "La fase corrente e' gia' chiusa: non puoi piu' salvare o inviare la schedina."
    );
  }

  if (payload.submit) {
    const missingPrediction = phaseMatches.some((matchDoc) => !predictions[matchDoc.id]);
    if (missingPrediction || !topScorerPick || !winnerPick) {
      throw new FirebaseError(
        "functions/failed-precondition",
        "Completa tutta la schedina prima dell'invio."
      );
    }
  }

  const nextStatus: ScheduleStatus = payload.submit
    ? "inviata"
    : currentStatus === "rifiutata"
    ? "rifiutata"
    : "bozza";

  await updateDoc(playerRef, {
    predictions,
    topScorerPick,
    winnerPick,
    scheduleStatus: nextStatus,
  });

  return { scheduleStatus: nextStatus };
}

export async function joinGameWithCode(payload: JoinGamePayload): Promise<JoinGameResult> {
  const callable = httpsCallable<JoinGamePayload, JoinGameResult>(functions, "joinGame");
  try {
    const result = await callable(payload);
    return result.data;
  } catch (error) {
    if (!shouldFallbackToDirectFirestore(error)) {
      throw error;
    }
    return joinGameDirect(payload);
  }
}

export async function saveSchedule(payload: SaveSchedulePayload): Promise<SaveScheduleResult> {
  const callable = httpsCallable<SaveSchedulePayload, SaveScheduleResult>(functions, "saveSchedule");
  try {
    const result = await callable(payload);
    return result.data;
  } catch (error) {
    if (!shouldFallbackToDirectFirestore(error)) {
      throw error;
    }
    return saveScheduleDirect(payload);
  }
}
