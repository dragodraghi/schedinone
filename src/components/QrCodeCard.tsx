import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SHARE_URL, shareInvite, copyInvite } from "../lib/invite";
import Toast, { type ToastData } from "./Toast";
import { vibrate } from "../lib/haptic";

/**
 * QR code + invite block for the admin panel. The QR can be screenshotted
 * and used as a WhatsApp status, printed, or just shown to someone's phone
 * camera to onboard them instantly.
 */
export default function QrCodeCard() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    vibrate("tap");
    try {
      await shareInvite();
    } catch {
      setToast({ message: "Errore nella condivisione", type: "error" });
    }
  };

  const handleCopy = async () => {
    vibrate("tap");
    const ok = await copyInvite();
    setToast({
      message: ok ? "Messaggio copiato negli appunti" : "Copia non riuscita",
      type: ok ? "success" : "error",
    });
  };

  const handleCopyLink = async () => {
    vibrate("tap");
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setToast({ message: "Link copiato", type: "success" });
    } catch {
      setToast({ message: "Copia non riuscita", type: "error" });
    }
  };

  return (
    <>
      <Toast toast={toast} onDone={() => setToast(null)} />

      <div
        className="glass rounded-xl p-4 space-y-3"
        style={{ border: "1px solid rgba(37, 211, 102, 0.25)" }}
      >
        <div>
          <p
            className="text-[10px] uppercase tracking-wider"
            style={{
              color: "#25d366",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 700,
            }}
          >
            📲 Condividi il gioco
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Fai uno screenshot del QR e mettilo su stato WhatsApp, oppure usa i bottoni per invitare tramite WhatsApp.
          </p>
        </div>

        {/* QR code — clickable to zoom for easier scanning / screenshot */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="block mx-auto rounded-xl p-4 transition-all hover:scale-[1.02]"
          style={{ background: "white", lineHeight: 0 }}
          aria-label="Ingrandisci QR per screenshot"
        >
          <div ref={svgRef}>
            <QRCodeSVG
              value={SHARE_URL}
              size={180}
              level="M"
              marginSize={0}
              bgColor="#ffffff"
              fgColor="#040810"
            />
          </div>
        </button>

        {/* Reminder: comunicare il codice separatamente */}
        <div
          className="rounded-lg p-3 text-center"
          style={{
            background: "rgba(255, 215, 0, 0.06)",
            border: "1px solid rgba(255, 215, 0, 0.25)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--gold)", fontFamily: "Outfit, sans-serif", fontWeight: 700 }}
          >
            Codice gioco
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Comunicalo separatamente ai giocatori (non è incluso nel link/QR).
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="btn-glow py-2.5 rounded-lg font-black text-xs transition-all"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "linear-gradient(135deg, #25d366, #128c7e)",
              color: "white",
              boxShadow: "0 0 16px rgba(37, 211, 102, 0.2)",
            }}
          >
            📤 Invita
          </button>
          <button
            onClick={handleCopy}
            className="glass py-2.5 rounded-lg font-bold text-xs transition-all"
            style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-muted)" }}
          >
            📋 Copia msg
          </button>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full text-[11px] py-1.5 transition-all"
          style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}
        >
          Copia solo il link →
        </button>
      </div>

      {/* Zoomed QR overlay for screenshot */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(4, 8, 16, 0.95)", backdropFilter: "blur(8px)" }}
          onClick={() => setZoomed(false)}
        >
          <div className="text-center space-y-4 animate-in">
            <div
              className="rounded-2xl p-6 mx-auto"
              style={{ background: "white", display: "inline-block", lineHeight: 0 }}
            >
              <QRCodeSVG
                value={SHARE_URL}
                size={260}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#040810"
              />
            </div>
            <div>
              <p
                className="text-3xl font-black"
                style={{
                  fontFamily: "Outfit, sans-serif",
                  background: "linear-gradient(135deg, #00d4ff, #ffd700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SCHEDINONE
              </p>
              <p className="text-sm mt-1 tracking-widest uppercase" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
                Mondiali 2026
              </p>
              <p className="text-xs mt-3" style={{ color: "var(--text-primary)" }}>
                Scansiona il QR per aprire l'app.
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                Il codice gioco va comunicato a parte dal Comitato.
              </p>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Tocca fuori per chiudere · Fai uno screenshot per salvarlo
            </p>
          </div>
        </div>
      )}
    </>
  );
}
