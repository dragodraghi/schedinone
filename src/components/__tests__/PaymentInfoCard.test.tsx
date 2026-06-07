import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PaymentInfoCard from "../PaymentInfoCard";

describe("PaymentInfoCard", () => {
  it("shows bank transfer details and payment acceptance rule", () => {
    render(<PaymentInfoCard teamName="Aureliano Buendia" entryFee={50} paid={false} />);

    expect(screen.getByText("50 euro")).toBeInTheDocument();
    expect(screen.getByText("LT86 3250 0662 0278 3701")).toBeInTheDocument();
    expect(screen.getByText("Alberto Pileri")).toBeInTheDocument();
    expect(screen.getByText("Aureliano Buendia")).toBeInTheDocument();
    expect(screen.getByText(/accettata dal Comitato solo dopo verifica del pagamento/i)).toBeInTheDocument();
  });

  it("copies IBAN and payment reason", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PaymentInfoCard teamName="Aureliano Buendia" entryFee={50} paid={false} />);

    fireEvent.click(screen.getByRole("button", { name: /copia iban/i }));
    fireEvent.click(screen.getByRole("button", { name: /copia causale/i }));

    expect(writeText).toHaveBeenNthCalledWith(1, "LT863250066202783701");
    expect(writeText).toHaveBeenNthCalledWith(2, "Aureliano Buendia");
  });
});
