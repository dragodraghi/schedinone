/**
 * Shared helpers for sharing the game with friends. Used by both the
 * Profile "Invita amici" button and the Admin QR code card.
 */

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/** Build the public URL for invites / QR codes. */
export function getShareUrl(): string {
  const envUrl = typeof import.meta.env.VITE_SHARE_URL === "string"
    ? import.meta.env.VITE_SHARE_URL.trim()
    : "";
  if (envUrl) {
    return `${trimTrailingSlash(envUrl)}/?v=2026`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${trimTrailingSlash(window.location.origin)}/?v=2026`;
  }
  return "https://schedinone-2026.web.app/?v=2026";
}

export function getShareHost(): string {
  try {
    return new URL(getShareUrl()).host;
  } catch {
    return "schedinone-2026.web.app";
  }
}

/**
 * Build the invite message (Italian, WhatsApp-ready).
 * Opens with the eye-catching line, explains, ends with link + code.
 */
export function buildInviteMessage(accessCode: string): string {
  const shareUrl = getShareUrl();
  return (
    "⚽ *SCHEDINONE — Mondiali 2026*\n\n" +
    "Gioca con noi ai pronostici del Mondiale! Compila la schedina (1/X/2 + capocannoniere + vincitrice) e sfida tutti noi per il montepremi.\n\n" +
    `🔗 ${shareUrl}\n` +
    `🔑 Codice: ${accessCode}\n\n` +
    "Si installa sul telefono come un'app vera (Chrome → menu → Aggiungi a schermata Home). In bocca al lupo! 🍀"
  );
}

/**
 * Try native Web Share API first (works on iOS Safari + Android Chrome +
 * modern PWAs), fallback to opening WhatsApp with the pre-filled text.
 * Returns true if a share dialog opened successfully.
 */
export async function shareInvite(accessCode: string): Promise<boolean> {
  const shareUrl = getShareUrl();
  const text = buildInviteMessage(accessCode);
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: "SCHEDINONE — Mondiali 2026",
        text,
        url: shareUrl,
      });
      return true;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return false;
    }
  }

  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;
  window.open(waUrl, "_blank");
  return true;
}

/** Copy the invite text to the clipboard. Returns true on success. */
export async function copyInvite(accessCode: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildInviteMessage(accessCode));
    return true;
  } catch {
    return false;
  }
}
