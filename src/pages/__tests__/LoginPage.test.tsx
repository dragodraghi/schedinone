import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "../LoginPage";

describe("LoginPage", () => {
  it("renders name and code inputs", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText("Il tuo nome squadra")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Codice gioco")).toBeInTheDocument();
    expect(screen.getByText("Entra in gioco")).toBeInTheDocument();
  });

  it("disables button when fields are empty", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByText("Entra in gioco")).toBeDisabled();
  });

  it("calls onLogin with name and code", () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText("Il tuo nome squadra"), { target: { value: "Marco" } });
    fireEvent.change(screen.getByPlaceholderText("Codice gioco"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText("Entra in gioco"));
    expect(onLogin).toHaveBeenCalledWith("Marco", "ABC123");
  });
});
