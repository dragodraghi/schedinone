import { describe, expect, it } from "vitest";
import { findFaq, matchFaq } from "../chatbotFaq";

describe("chatbot payment FAQ", () => {
  it("answers payment questions with IBAN, amount and acceptance rule", () => {
    const entry = matchFaq("come pago la quota con bonifico?");

    expect(entry?.id).toBe("quota");
    expect(entry?.answer).toContain("50 euro");
    expect(entry?.answer).toContain("LT86 3250 0662 0278 3701");
    expect(entry?.answer).toContain("Alberto Pileri");
    expect(entry?.answer).toContain("Causale: nome della tua squadra");
    expect(entry?.answer).toContain("La schedina verra' accettata dal Comitato solo dopo la verifica del pagamento");
  });

  it("keeps payment FAQ available as a quick question", () => {
    expect(findFaq("quota")?.question).toBe("Come pago la quota?");
  });
});
