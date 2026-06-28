import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toast from "../Toast";

describe("Toast", () => {
  it("announces messages to assistive technologies", () => {
    render(<Toast toast={{ message: "Risultato salvato", type: "success" }} onDone={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Risultato salvato");
  });
});
