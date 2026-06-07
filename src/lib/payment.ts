export const PAYMENT_DETAILS = {
  entryFee: 50,
  ibanRaw: "LT863250066202783701",
  ibanDisplay: "LT86 3250 0662 0278 3701",
  accountHolder: "Alberto Pileri",
  reasonHint: "Nome della tua squadra",
};

export function paymentReason(teamName: string): string {
  const trimmed = teamName.trim();
  return trimmed || PAYMENT_DETAILS.reasonHint;
}
