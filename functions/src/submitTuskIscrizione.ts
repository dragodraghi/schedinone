import * as admin from "firebase-admin";
import { createHash } from "node:crypto";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

const TUSK_PENDING_COLLECTION = "tusk_iscrizioni_pending";
const TUSK_RATE_LIMITS_COLLECTION = "tusk_rate_limits";

const VALID_CATEGORIE = new Set([
  "ultimate",
  "advanced",
  "challenge",
  "essential",
  "performance",
  "intermediate",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^[+()\d\s.-]+$/;
const IP_MIN_INTERVAL_MS = 30 * 1000;
const IP_DAILY_MAX = 60;
const ENTRY_MIN_INTERVAL_MS = 10 * 60 * 1000;
const ENTRY_DAILY_MAX = 3;

type TuskIscrizioneInput = {
  nome: string;
  categoriaId: string;
  box: string;
  contatto: string;
  note: string;
};

type RateLimitWrite = {
  day: string;
  count: number;
  lastAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isValidContact(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && PHONE_RE.test(value);
}

function sanitizeInput(data: unknown): TuskIscrizioneInput {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const input = {
    nome: normalizeText(raw.nome),
    categoriaId: normalizeText(raw.categoriaId),
    box: normalizeText(raw.box),
    contatto: normalizeText(raw.contatto),
    note: normalizeText(raw.note).slice(0, 300),
  };

  if (input.nome.length < 2 || input.nome.length > 80 || input.nome.split(" ").length < 2) {
    throw new HttpsError("invalid-argument", "Inserisci nome e cognome.");
  }
  if (!VALID_CATEGORIE.has(input.categoriaId)) {
    throw new HttpsError("invalid-argument", "Categoria non valida.");
  }
  if (input.box.length < 2 || input.box.length > 80) {
    throw new HttpsError("invalid-argument", "Box non valido.");
  }
  if (input.contatto.length < 5 || input.contatto.length > 80 || !isValidContact(input.contatto)) {
    throw new HttpsError("invalid-argument", "Contatto non valido.");
  }
  if (input.note.length > 300) {
    throw new HttpsError("invalid-argument", "Note troppo lunghe.");
  }

  return input;
}

function dayKey(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const maybeTimestamp = value as { toMillis?: unknown };
  return typeof maybeTimestamp.toMillis === "function"
    ? maybeTimestamp.toMillis.call(value)
    : 0;
}

function hashKey(prefix: string, value: string): string {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 40);
  return `${prefix}_${hash}`;
}

function callerIp(request: CallableRequest<unknown>): string {
  const forwardedFor = request.rawRequest.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  return firstForwarded || request.rawRequest.ip || request.rawRequest.socket.remoteAddress || "unknown";
}

function nextRateLimitWrite(
  snap: admin.firestore.DocumentSnapshot,
  now: admin.firestore.Timestamp,
  minIntervalMs: number,
  dailyMax: number,
  message: string
): RateLimitWrite {
  const data = snap.data() ?? {};
  const nowMillis = now.toMillis();
  const lastMillis = timestampMillis(data.lastAt);
  if (lastMillis > 0 && nowMillis - lastMillis < minIntervalMs) {
    throw new HttpsError("resource-exhausted", message);
  }

  const today = dayKey(nowMillis);
  const count = data.day === today && typeof data.count === "number" ? data.count : 0;
  if (count >= dailyMax) {
    throw new HttpsError("resource-exhausted", message);
  }

  return {
    day: today,
    count: count + 1,
    lastAt: now,
    updatedAt: now,
  };
}

export const submitTuskIscrizione = onCall(
  { region: "europe-west1" },
  async (request) => {
    const input = sanitizeInput(request.data);
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const pendingRef = db.collection(TUSK_PENDING_COLLECTION).doc();
    const ipRef = db.collection(TUSK_RATE_LIMITS_COLLECTION).doc(hashKey("ip", callerIp(request)));
    const entryRef = db
      .collection(TUSK_RATE_LIMITS_COLLECTION)
      .doc(hashKey("entry", `${input.nome.toLowerCase()}|${input.categoriaId}|${input.contatto.toLowerCase()}`));

    await db.runTransaction(async (tx) => {
      const [ipSnap, entrySnap] = await Promise.all([tx.get(ipRef), tx.get(entryRef)]);
      const ipLimit = nextRateLimitWrite(
        ipSnap,
        now,
        IP_MIN_INTERVAL_MS,
        IP_DAILY_MAX,
        "Troppe richieste da questa rete. Attendi un minuto e riprova."
      );
      const entryLimit = nextRateLimitWrite(
        entrySnap,
        now,
        ENTRY_MIN_INTERVAL_MS,
        ENTRY_DAILY_MAX,
        "Questa richiesta sembra gia' inviata. Riprova piu' tardi se devi correggere i dati."
      );

      tx.set(ipRef, ipLimit, { merge: true });
      tx.set(entryRef, entryLimit, { merge: true });
      tx.create(pendingRef, {
        ...input,
        createdAt: now,
        source: "callable",
      });
    });

    return { ok: true, id: pendingRef.id };
  }
);
