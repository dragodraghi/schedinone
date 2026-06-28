import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { CLASSIC_GAME_ID, GOLDEN_GAME_ID } from "./gameIds";

type AccessData = Record<string, unknown> | undefined;

export type GoldenAccessRequestInfo = {
  displayName: string;
  contact?: string;
};

function asCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isNewPendingGoldenAccessRequest(before: AccessData, after: AccessData): boolean {
  return !before
    && after?.status === "pending"
    && after?.type === "new-request"
    && asCleanString(after.displayName).length > 0;
}

export function readGoldenAccessRequestInfo(data: AccessData): GoldenAccessRequestInfo | null {
  const displayName = asCleanString(data?.displayName);
  if (!displayName) return null;
  const contact = asCleanString(data?.contact);
  return contact ? { displayName, contact } : { displayName };
}

export function buildGoldenAccessRequestMessage(request: GoldenAccessRequestInfo): string {
  return [
    `Richiesta Golden Plus da ${request.displayName}`,
    `Contatto: ${request.contact || "non indicato"}`,
    "Apri Admin > Golden Plus per approvare o rifiutare.",
  ].join("\n");
}

async function sourceGameIdForGoldenRequest(db: FirebaseFirestore.Firestore, gameId: string): Promise<string> {
  const gameSnap = await db.doc(`games/${gameId}`).get();
  const sourceGameId = asCleanString(gameSnap.data()?.sourceGameId);
  return sourceGameId || CLASSIC_GAME_ID;
}

export const onGoldenAccessRequestCreated = onDocumentCreated(
  { document: "games/{gameId}/access/{accessUid}", region: "europe-west1" },
  async (event) => {
    const { gameId, accessUid } = event.params;
    const data = event.data?.data();
    if (gameId !== GOLDEN_GAME_ID || !isNewPendingGoldenAccessRequest(undefined, data)) return;

    const requestInfo = readGoldenAccessRequestInfo(data);
    if (!requestInfo) return;

    const db = admin.firestore();
    const sourceGameId = await sourceGameIdForGoldenRequest(db, gameId);
    const messageRef = db.doc(`games/${sourceGameId}/threads/${accessUid}/messages/golden-plus-request`);

    await messageRef.set({
      text: buildGoldenAccessRequestMessage(requestInfo),
      from: "player",
      senderUid: accessUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
