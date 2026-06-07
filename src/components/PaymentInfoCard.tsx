import { useState } from "react";
import { PAYMENT_DETAILS, paymentReason } from "../lib/payment";

interface Props {
  teamName: string;
  entryFee?: number;
  paid: boolean;
  compact?: boolean;
}

type CopiedField = "iban" | "reason" | null;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export default function PaymentInfoCard({ teamName, entryFee = PAYMENT_DETAILS.entryFee, paid, compact = false }: Props) {
  const [copied, setCopied] = useState<CopiedField>(null);
  const reason = paymentReason(teamName);

  const handleCopy = async (field: Exclude<CopiedField, null>, value: string) => {
    await copyText(value);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <section
      className="surface-panel p-4 sm:p-5 space-y-4"
      style={{
        borderColor: paid ? "rgba(0,255,136,0.35)" : "rgba(255,215,0,0.35)",
        background: paid ? "rgba(0,255,136,0.07)" : "rgba(255,215,0,0.07)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="micro-label" style={{ color: paid ? "var(--correct)" : "var(--gold)" }}>
            Quota iscrizione
          </p>
          <h2 className="mt-1 text-lg font-black" style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}>
            {paid ? "Pagamento registrato" : "Pagamento con bonifico"}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {paid
              ? "Il Comitato ha segnato la quota come pagata."
              : "La schedina sara' accettata dal Comitato solo dopo verifica del pagamento."}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: paid ? "var(--correct)" : "var(--gold)",
            background: paid ? "rgba(0,255,136,0.12)" : "rgba(255,215,0,0.12)",
            border: `1px solid ${paid ? "rgba(0,255,136,0.35)" : "rgba(255,215,0,0.35)"}`,
          }}
        >
          {paid ? "Pagata" : "Da pagare"}
        </span>
      </div>

      {!paid && (
        <>
          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <PaymentLine label="Importo" value={`${entryFee} euro`} accent="var(--gold)" />
            <PaymentLine label="Intestatario" value={PAYMENT_DETAILS.accountHolder} />
            <PaymentLine label="IBAN" value={PAYMENT_DETAILS.ibanDisplay} wide />
            <PaymentLine label="Causale" value={reason} wide />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleCopy("iban", PAYMENT_DETAILS.ibanRaw)}
              className="secondary-action px-3"
              style={{ borderColor: "rgba(255,215,0,0.35)", color: "var(--gold)" }}
            >
              {copied === "iban" ? "IBAN copiato" : "Copia IBAN"}
            </button>
            <button
              type="button"
              onClick={() => handleCopy("reason", reason)}
              className="secondary-action px-3"
              style={{ borderColor: "rgba(0,212,255,0.35)", color: "var(--accent)" }}
            >
              {copied === "reason" ? "Causale copiata" : "Copia causale"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function PaymentLine({
  label,
  value,
  accent,
  wide = false,
}: {
  label: string;
  value: string;
  accent?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${wide ? "sm:col-span-2" : ""}`}
      style={{
        borderColor: "rgba(255,255,255,0.09)",
        background: "rgba(4,8,16,0.26)",
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}>
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-black" style={{ color: accent ?? "var(--text-primary)", fontFamily: "Outfit, sans-serif" }}>
        {value}
      </p>
    </div>
  );
}
