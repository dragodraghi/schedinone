import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  sanitizeTuskIscrizioneInput,
  TUSK_CATEGORIE,
  TuskCategoriaId,
  TuskIscrizioneInputError,
} from "./tuskIscrizioneData";

const COL = {
  eventi: "tusk_eventi",
  atletiPubblici: "tusk_atleti_pubblici",
  iscrizioni: "tusk_iscrizioni_pending",
  iscrizioniStatoPubblico: "tusk_iscrizioni_stato",
};

const CONFIG_ISCRIZIONI_ID = "_config_iscrizioni";
const STATO_ISCRIZIONI_ID = "_summary";

function toHttpsError(err: unknown): HttpsError {
  if (err instanceof HttpsError) return err;
  if (err instanceof TuskIscrizioneInputError) {
    return new HttpsError("invalid-argument", err.message);
  }
  return new HttpsError("internal", "Invio iscrizione non riuscito.");
}

function emptyCounts(): Record<TuskCategoriaId, number> {
  return Object.fromEntries(TUSK_CATEGORIE.map((cat) => [cat.id, 0])) as Record<TuskCategoriaId, number>;
}

async function syncPublicRegistrationStatus(db: admin.firestore.Firestore): Promise<void> {
  const [configSnap, atletiSnap, pendingSnap] = await Promise.all([
    db.collection(COL.eventi).doc(CONFIG_ISCRIZIONI_ID).get(),
    db.collection(COL.atletiPubblici).get(),
    db.collection(COL.iscrizioni).get(),
  ]);

  const caps = (configSnap.data()?.caps ?? {}) as Record<string, unknown>;
  const approvati = emptyCounts();
  const pending = emptyCounts();

  for (const doc of atletiSnap.docs) {
    const categoriaId = doc.data().categoriaId as TuskCategoriaId | undefined;
    if (categoriaId && categoriaId in approvati) approvati[categoriaId] += 1;
  }
  for (const doc of pendingSnap.docs) {
    const categoriaId = doc.data().categoriaId as TuskCategoriaId | undefined;
    if (categoriaId && categoriaId in pending) pending[categoriaId] += 1;
  }

  const categorie: Record<string, unknown> = {};
  for (const cat of TUSK_CATEGORIE) {
    const cap = Number(caps[cat.id] || 0);
    const occupati = approvati[cat.id] + pending[cat.id];
    const disponibili = cap > 0 ? Math.max(cap - occupati, 0) : null;
    const ratio = cap > 0 ? occupati / cap : 0;
    const stato = cap <= 0
      ? "Slot da impostare"
      : disponibili === 0
        ? "Completa"
        : ratio >= 0.8
          ? "Quasi completa"
          : "Aperta";

    categorie[cat.id] = {
      nome: cat.nome,
      cap,
      approvati: approvati[cat.id],
      pending: pending[cat.id],
      occupati,
      disponibili,
      stato,
    };
  }

  await db.collection(COL.iscrizioniStatoPubblico).doc(STATO_ISCRIZIONI_ID).set({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    categorie,
  }, { merge: true });
}

export const submitTuskIscrizione = onCall(
  { region: "europe-west1" },
  async (request) => {
    try {
      const data = sanitizeTuskIscrizioneInput(request.data);
      const db = admin.firestore();
      const createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection(COL.iscrizioni).add({
        ...data,
        createdAt,
      });
      await syncPublicRegistrationStatus(db);
      return { ok: true, id: ref.id };
    } catch (err) {
      throw toHttpsError(err);
    }
  }
);
