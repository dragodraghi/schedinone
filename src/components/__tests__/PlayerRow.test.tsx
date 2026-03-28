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
});
