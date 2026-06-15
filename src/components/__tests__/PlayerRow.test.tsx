import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlayerRow from "../PlayerRow";

describe("PlayerRow", () => {
  it("renders rank, name, and points", () => {
    const { container } = render(<PlayerRow rank={1} name="Giulia" points={12} isCurrentUser={false} />);
    expect(screen.getByText("Giulia")).toBeInTheDocument();
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("pt");
  });
  it("shows medal for top 3", () => {
    const { container } = render(<PlayerRow rank={1} name="A" points={10} isCurrentUser={false} />);
    expect(container.textContent).toContain("🥇");
  });
  it("highlights current user row", () => {
    const { container } = render(<PlayerRow rank={3} name="Marco" points={8} isCurrentUser={true} />);
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain("border");
  });

  it("shows an up arrow when the player gained positions", () => {
    render(<PlayerRow rank={2} name="A" points={10} isCurrentUser={false} previousRank={5} />);
    const indicator = screen.getByLabelText(/Salito di 3 posizioni/i);
    expect(indicator.textContent).toBe("▲");
  });

  it("shows a down arrow when the player lost positions", () => {
    render(<PlayerRow rank={6} name="A" points={4} isCurrentUser={false} previousRank={2} />);
    const indicator = screen.getByLabelText(/Sceso di 4 posizioni/i);
    expect(indicator.textContent).toBe("▼");
  });

  it("shows '=' when the position is unchanged", () => {
    render(<PlayerRow rank={4} name="A" points={6} isCurrentUser={false} previousRank={4} />);
    const indicator = screen.getByLabelText(/Posizione invariata/i);
    expect(indicator.textContent).toBe("=");
  });

  it("shows no movement glyph when there is no previous rank", () => {
    render(<PlayerRow rank={1} name="A" points={6} isCurrentUser={false} />);
    expect(screen.queryByLabelText(/posizione|invariata|salito|sceso/i)).toBeNull();
  });
});
