import * as admin from "firebase-admin";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendPushToUids(uids: string[], payload: PushPayload): Promise<void> {
  if (uids.length === 0) return;
  const db = admin.firestore();
  const tokens: { token: string; uid: string; ref: FirebaseFirestore.DocumentReference }[] = [];

  for (const uid of uids) {
    const snap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    snap.forEach((d) => tokens.push({ token: d.id, uid, ref: d.ref }));
  }
  if (tokens.length === 0) return;

  const res = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });

  const deletions: Promise<unknown>[] = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code ?? "";
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
      deletions.push(tokens[i].ref.delete());
    }
  });
  await Promise.all(deletions);
}
