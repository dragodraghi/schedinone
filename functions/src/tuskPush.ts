import * as admin from "firebase-admin";
import * as webpush from "web-push";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import {
  buildTuskPushPayload,
  isExpiredWebPushStatus,
  normalizeVapidPrivateKey,
  summarizeTuskPushResults,
  type TuskPushPayload,
  type TuskPushSendResult,
  type TuskPushSource,
} from "./tuskPushData";

const TUSK_WEB_PUSH_PUBLIC_KEY = "BKsRof-QskuMLrsEfy1d4kwfFjyZQ7VYB4ZgGYLhzwQ5o58A7TDNHTSMiqA04lONsv_Reww0Ci6doI7L3AOrRGg";
const TUSK_VAPID_PRIVATE_KEY = defineSecret("TUSK_VAPID_PRIVATE_KEY");

const COL = {
  adminPushSubscriptions: "tusk_admin_push_subscriptions",
  pushAudit: "tusk_push_audit",
};

function webPushSubscription(data: admin.firestore.DocumentData): webpush.PushSubscription | null {
  if (
    typeof data.endpoint !== "string" ||
    typeof data.p256dh !== "string" ||
    typeof data.auth !== "string"
  ) {
    return null;
  }
  return {
    endpoint: data.endpoint,
    keys: {
      p256dh: data.p256dh,
      auth: data.auth,
    },
  };
}

function errorStatusCode(err: unknown): number | null {
  if (!err || typeof err !== "object" || !("statusCode" in err)) return null;
  const statusCode = Number((err as { statusCode?: unknown }).statusCode);
  return Number.isFinite(statusCode) ? statusCode : null;
}

function errorReason(err: unknown): string {
  const statusCode = errorStatusCode(err);
  const prefix = statusCode ? `${statusCode}: ` : "";
  if (err instanceof Error && err.message) return `${prefix}${err.message}`.slice(0, 160);
  return String(err || "errore sconosciuto").slice(0, 160);
}

async function sendToSubscription(
  doc: admin.firestore.QueryDocumentSnapshot,
  payload: TuskPushPayload
): Promise<TuskPushSendResult> {
  const subscription = webPushSubscription(doc.data());
  if (!subscription) {
    await doc.ref.delete();
    return { ok: false, reason: "subscription incompleta", expired: true };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    await doc.ref.set({
      lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: admin.firestore.FieldValue.delete(),
      lastErrorAt: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    return { ok: true };
  } catch (err) {
    const statusCode = errorStatusCode(err);
    const expired = isExpiredWebPushStatus(statusCode);
    if (expired) {
      await doc.ref.delete();
    } else {
      await doc.ref.set({
        lastError: errorReason(err),
        lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { ok: false, reason: errorReason(err), expired };
  }
}

async function sendTuskPush(source: TuskPushSource, data: Record<string, unknown>): Promise<void> {
  const privateKey = normalizeVapidPrivateKey(TUSK_VAPID_PRIVATE_KEY.value());
  if (!privateKey) {
    throw new Error("TUSK_VAPID_PRIVATE_KEY non configurata.");
  }

  webpush.setVapidDetails(
    "mailto:admin@tusk-badboars.com",
    TUSK_WEB_PUSH_PUBLIC_KEY,
    privateKey
  );

  const db = admin.firestore();
  const payload = buildTuskPushPayload(source, data);
  const subsSnap = await db.collection(COL.adminPushSubscriptions).get();
  const results = await Promise.all(subsSnap.docs.map((doc) => sendToSubscription(doc, payload)));
  const summary = summarizeTuskPushResults(results);

  await db.collection(COL.pushAudit).add({
    source,
    title: payload.title,
    body: payload.body,
    sent: summary.sent,
    failed: summary.failed,
    deleted: summary.deleted,
    errors: summary.errors,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export const onTuskRegistrationCreated = onDocumentCreated(
  {
    document: "tusk_iscrizioni_pending/{iscrizioneId}",
    region: "europe-west1",
    secrets: [TUSK_VAPID_PRIVATE_KEY],
  },
  async (event) => {
    await sendTuskPush("registration", {
      ...(event.data?.data() ?? {}),
      id: event.params.iscrizioneId,
    });
  }
);

export const onTuskPushTestCreated = onDocumentCreated(
  {
    document: "tusk_push_tests/{testId}",
    region: "europe-west1",
    secrets: [TUSK_VAPID_PRIVATE_KEY],
  },
  async (event) => {
    await sendTuskPush("test", event.data?.data() ?? {});
  }
);
