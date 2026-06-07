import * as admin from "firebase-admin";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

type PushResponseLike = {
  success: boolean;
  error?: { code?: string } | null;
};

export type PushDeliveryReport = {
  uidCount: number;
  tokenCount: number;
  successCount: number;
  failureCount: number;
  deleteTokenIndexes: number[];
  failureCodes: Record<string, number>;
};

const DELETE_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

export function summarizePushResponses(
  uidCount: number,
  tokenCount: number,
  responses: PushResponseLike[]
): PushDeliveryReport {
  const report: PushDeliveryReport = {
    uidCount,
    tokenCount,
    successCount: 0,
    failureCount: 0,
    deleteTokenIndexes: [],
    failureCodes: {},
  };

  responses.forEach((response, index) => {
    if (response.success) {
      report.successCount += 1;
      return;
    }

    report.failureCount += 1;
    const code = response.error?.code ?? "unknown";
    report.failureCodes[code] = (report.failureCodes[code] ?? 0) + 1;
    if (DELETE_TOKEN_ERROR_CODES.has(code)) {
      report.deleteTokenIndexes.push(index);
    }
  });

  return report;
}

function emptyPushReport(uidCount: number): PushDeliveryReport {
  return {
    uidCount,
    tokenCount: 0,
    successCount: 0,
    failureCount: 0,
    deleteTokenIndexes: [],
    failureCodes: {},
  };
}

export async function sendPushToUids(uids: string[], payload: PushPayload): Promise<PushDeliveryReport> {
  const uniqueUids = Array.from(new Set(uids.filter((uid) => typeof uid === "string" && uid.trim().length > 0)));
  if (uniqueUids.length === 0) return emptyPushReport(0);
  const db = admin.firestore();
  const tokens: { token: string; uid: string; ref: FirebaseFirestore.DocumentReference }[] = [];

  for (const uid of uniqueUids) {
    const snap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    snap.forEach((d) => tokens.push({ token: d.id, uid, ref: d.ref }));
  }
  if (tokens.length === 0) {
    const report = emptyPushReport(uniqueUids.length);
    console.info("[messaging] no push tokens", {
      uidCount: report.uidCount,
      title: payload.title,
      kind: payload.data?.kind ?? null,
    });
    return report;
  }

  let res: admin.messaging.BatchResponse;
  try {
    res = await admin.messaging().sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    });
  } catch (error) {
    console.error("[messaging] push send failed", {
      uidCount: uniqueUids.length,
      tokenCount: tokens.length,
      title: payload.title,
      kind: payload.data?.kind ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const report = summarizePushResponses(uniqueUids.length, tokens.length, res.responses);

  const deletions = report.deleteTokenIndexes.map((index) => tokens[index].ref.delete());
  await Promise.all(deletions);
  console.info("[messaging] push delivery report", {
    uidCount: report.uidCount,
    tokenCount: report.tokenCount,
    successCount: report.successCount,
    failureCount: report.failureCount,
    deletedTokenCount: report.deleteTokenIndexes.length,
    failureCodes: report.failureCodes,
    title: payload.title,
    kind: payload.data?.kind ?? null,
  });
  return report;
}
