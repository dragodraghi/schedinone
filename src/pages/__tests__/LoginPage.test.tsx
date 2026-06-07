import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "../LoginPage";

describe("LoginPage", () => {
  it("renders name and code inputs", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText("Nome della tua squadra")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Entra in gioco")).toBeInTheDocument();
  });

  it("disables button when fields are empty", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByText("Entra in gioco")).toBeDisabled();
  });

  it("calls onLogin with name and code", () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText("Nome della tua squadra"), { target: { value: "Marco" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText("Entra in gioco"));
    expect(onLogin).toHaveBeenCalledWith("Marco", "ABC123");
  });

  it("explains team-name and password access in the help modal", () => {
    render(<LoginPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText("Come funziona?"));
    expect(screen.getByText(/Inserisci il nome della tua squadra e la password/i)).toBeInTheDocument();
    expect(screen.getByText(/non si puo' entrare nell'account di un'altra squadra/i)).toBeInTheDocument();
  });
});
