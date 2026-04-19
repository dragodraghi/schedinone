/**
 * Shared helpers for sharing the game with friends. Used by both the
 * Profile "Invita amici" button and the Admin QR code card.
 */

/** Hard-coded share URL. Cache-busted so WhatsApp refetches the OG preview. */
export const SHARE_URL = "https://schedinone-2026.web.app/?v=2026";

/** The player access code shown in the invite. */
export const ACCESS_CODE = "GIOCA2026";

/**
 * Build the invite message (Italian, WhatsApp-ready).
 * Opens with the eye-catching line, explains, ends with link + code.
 */
export function buildInviteMessage(): string {
  return (
    "⚽ *SCHEDINONE — Mondiali 2026*\n\n" +
    "Gioca con noi ai pronostici del Mondiale! Compila la schedina (1/X/2 + capocannoniere + vincitrice) e sfida tutti noi per il montepremi.\n\n" +
    `🔗 ${SHARE_URL}\n` +
    `🔑 Codice: ${ACCESS_CODE}\n\n` +
    "Si installa sul telefono come un'app vera (Chrome → menu → Aggiungi a schermata Home). In bocca al lupo! 🍀"
  );
}

/**
 * Try native Web Share API first (works on iOS Safari + Android Chrome +
 * modern PWAs), fallback to opening WhatsApp with the pre-filled text.
 * Returns true if a share dialog opened successfully.
 */
export async function shareInvite(): Promise<boolean> {
  const text = buildInviteMessage();
  // Most OSes' share sheet handles title/text/url well
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({
        title: "SCHEDINONE — Mondiali 2026",
        text,
        url: SHARE_URL,
      });
      return true;
    } catch (err) {
      // User cancelled — don't fall back, they chose to dismiss
      if ((err as Error)?.name === "AbortError") return false;
      // Other error (permission denied, etc.) → fallback below
    }
  }

  // Fallback: open WhatsApp with preformatted text
  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;
  window.open(waUrl, "_blank");
  return true;
}

/** Copy the invite text to the clipboard. Returns true on success. */
export async function copyInvite(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildInviteMessage());
    return true;
  } catch {
    return false;
  }
}
