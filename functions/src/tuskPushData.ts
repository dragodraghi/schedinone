export type TuskPushSource = "registration" | "test";

export interface TuskPushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  requireInteraction: boolean;
  renotify: boolean;
}

export interface TuskPushSendResult {
  ok: boolean;
  reason?: string;
  expired?: boolean;
}

export interface TuskPushSummary {
  sent: number;
  failed: number;
  deleted: number;
  errors: string[];
}

const CATEGORIE: Record<string, string> = {
  ultimate: "Ultimate (M)",
  advanced: "Advanced (M)",
  challenge: "Challenge (M)",
  essential: "Essential (M)",
  performance: "Performance (F)",
  intermediate: "Intermediate (F)",
};

function cleanText(value: unknown, fallback: string): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

export function buildTuskPushPayload(source: TuskPushSource, data: Record<string, unknown>): TuskPushPayload {
  if (source === "test") {
    return {
      title: "Test push TUSK",
      body: "Push server attiva: se leggi questa notifica, il telefono riceve anche a schermo spento.",
      url: "/giudici.html",
      tag: "tusk-test-push",
      requireInteraction: true,
      renotify: true,
    };
  }

  const nome = cleanText(data.nome, "Nuovo atleta");
  const categoriaId = cleanText(data.categoriaId, "");
  const categoria = CATEGORIE[categoriaId] || cleanText(data.categoriaId, "Categoria non indicata");
  const box = cleanText(data.box, "");
  const body = box ? `${nome} - ${categoria} - ${box}` : `${nome} - ${categoria}`;
  return {
    title: "Nuova iscrizione TUSK",
    body,
    url: "/giudici.html",
    tag: `tusk-nuova-iscrizione-${cleanText(data.id, String(Date.now()))}`,
    requireInteraction: true,
    renotify: true,
  };
}

export function summarizeTuskPushResults(results: TuskPushSendResult[]): TuskPushSummary {
  const sent = results.filter((result) => result.ok).length;
  const failedResults = results.filter((result) => !result.ok);
  return {
    sent,
    failed: failedResults.length,
    deleted: failedResults.filter((result) => result.expired).length,
    errors: failedResults
      .map((result) => result.reason || "errore sconosciuto")
      .slice(0, 6),
  };
}

export function normalizeVapidPrivateKey(value: string): string {
  return value.trim();
}

export function isExpiredWebPushStatus(statusCode: number | null): boolean {
  return statusCode === 400 || statusCode === 404 || statusCode === 410;
}
