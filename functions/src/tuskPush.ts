import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as webpush from "web-push";

const TUSK_WEB_PUSH_PUBLIC_KEY =
  "BBx-O2KO8XLZ-iNZENDaWT-nsUqsXnuKKFuuqS659lcqoLLTv-fWqE71l35OafSd3xmgFnjgX8MvqDpyWdzYxFc";
const TUSK_WEB_PUSH_PRIVATE_KEY = defineSecret("TUSK_WEB_PUSH_PRIVATE_KEY");
const TUSK_PUSH_SUBSCRIPTIONS = "tusk_admin_push_subscriptions";
const TUSK_PUSH_AUDIT = "tusk_push_audit";

type SubscriptionDoc = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  expirationTime?: unknown;
};

type TuskPushPayload = {
  title: string;
  body: string;
  url: string;
  icon: string;
  badge: string;
  tag: string;
  requireInteraction: boolean;
};

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asPushSubscription(data: SubscriptionDoc): webpush.PushSubscription | null {
  const endpoint = stringField(data.endpoint);
  const p256dh = stringField(data.p256dh);
  const auth = stringField(data.auth);
  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    expirationTime: typeof data.expirationTime === "number" ? data.expirationTime : null,
    keys: { p256dh, auth },
  };
}

function tuskCategoryLabel(categoriaId: unknown): string {
  const labels: Record<string, string> = {
    ultimate: "Ultimate (M)",
    advanced: "Advanced (M)",
    challenge: "Challenge (M)",
    essential: "Essential (M)",
    performance: "Performance (F)",
    intermediate: "Intermediate (F)",
  };
  return typeof categoriaId === "string" ? labels[categoriaId] ?? categoriaId : "Categoria non indicata";
}

function webPushStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

function configureWebPush() {
  webpush.setVapidDetails(
    "mailto:admin@tusk-badboars.com",
    TUSK_WEB_PUSH_PUBLIC_KEY,
    TUSK_WEB_PUSH_PRIVATE_KEY.value().trim()
  );
}

async function sendTuskPushToAdmins(source: string, sourceId: string, payload: TuskPushPayload) {
  configureWebPush();
  const db = admin.firestore();
  const snap = await db.collection(TUSK_PUSH_SUBSCRIPTIONS).get();
  let sent = 0;
  let failed = 0;
  let deleted = 0;
  const errors: string[] = [];

  await Promise.all(snap.docs.map(async (doc) => {
    const subscription = asPushSubscription(doc.data());
    if (!subscription) {
      await doc.ref.delete();
      deleted++;
      return;
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent++;
      await doc.ref.set({
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: admin.firestore.FieldValue.delete(),
      }, { merge: true });
    } catch (error) {
      const statusCode = webPushStatusCode(error);
      if (statusCode === 404 || statusCode === 410) {
        await doc.ref.delete();
        deleted++;
        return;
      }
      failed++;
      const errorLabel = statusCode ? `web-push-${statusCode}` : "web-push-error";
      errors.push(errorLabel);
      await doc.ref.set({
        lastError: errorLabel,
        lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.warn("TUSK web push failed", doc.id, statusCode, error);
    }
  }));

  await db.collection(TUSK_PUSH_AUDIT).add({
    source,
    sourceId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    subscriptionCount: snap.size,
    sent,
    failed,
    deleted,
    errors: errors.slice(0, 10),
    title: payload.title,
    body: payload.body,
  });
}

export const notifyTuskAdminOnIscrizione = onDocumentCreated(
  {
    document: "tusk_iscrizioni_pending/{iscrizioneId}",
    region: "europe-west1",
    secrets: [TUSK_WEB_PUSH_PRIVATE_KEY],
  },
  async (event) => {
    const iscrizione = event.data?.data();
    if (!iscrizione) return;

    const nome = stringField(iscrizione.nome) ?? "Nuovo atleta";
    const categoria = tuskCategoryLabel(iscrizione.categoriaId);
    const box = stringField(iscrizione.box);
    const body = box ? `${nome} - ${categoria} - ${box}` : `${nome} - ${categoria}`;
    await sendTuskPushToAdmins("iscrizione", event.params.iscrizioneId, {
      title: "Nuova iscrizione TUSK",
      body,
      url: "/giudici.html",
      icon: "/assets/icons/tusk-icon-192.png",
      badge: "/assets/icons/tusk-icon-192.png",
      tag: `tusk-iscrizione-${event.params.iscrizioneId}`,
      requireInteraction: true,
    });
  }
);

export const notifyTuskAdminTestPush = onDocumentCreated(
  {
    document: "tusk_push_tests/{testId}",
    region: "europe-west1",
    secrets: [TUSK_WEB_PUSH_PRIVATE_KEY],
  },
  async (event) => {
    await sendTuskPushToAdmins("test", event.params.testId, {
      title: "Test push TUSK",
      body: "Questa notifica arriva dalla Cloud Function.",
      url: "/giudici.html",
      icon: "/assets/icons/tusk-icon-192.png",
      badge: "/assets/icons/tusk-icon-192.png",
      tag: `tusk-test-${event.params.testId}`,
      requireInteraction: true,
    });
  }
);
