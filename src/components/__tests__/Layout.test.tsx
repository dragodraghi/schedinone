import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../Layout";

describe("Layout", () => {
  it("renders the player bottom tabs including profile access", () => {
    render(
      <MemoryRouter>
        <Layout><div>Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Schedina")).toBeInTheDocument();
    expect(screen.getByText("Classifica")).toBeInTheDocument();
    expect(screen.getByText("Griglione")).toBeInTheDocument();
    expect(screen.getByText("Profilo")).toBeInTheDocument();
    expect(screen.queryByText("Bacheca")).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <MemoryRouter>
        <Layout><div>Test Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("keeps the expanded Golden player navigation horizontally scrollable", () => {
    render(
      <MemoryRouter>
        <Layout hasGoldenAccess><div>Content</div></Layout>
      </MemoryRouter>
    );

    const scroller = screen.getByTestId("bottom-nav-scroll");

    expect(screen.getByRole("link", { name: /golden/i })).toHaveAttribute("href", "/golden-plus");
    expect(scroller).toHaveClass("overflow-x-auto");
    expect(scroller).toHaveClass("justify-start");
    expect(screen.getByRole("link", { name: /profilo/i })).toHaveClass("shrink-0");
  });

  it("does not render the player schedina tab for admins", () => {
    render(
      <MemoryRouter>
        <Layout isAdmin><div>Admin Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Schedina")).not.toBeInTheDocument();
    expect(screen.getByText("Classifica")).toBeInTheDocument();
    expect(screen.getByText("Profilo")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders the schedina tab for admins with a linked player profile", () => {
    render(
      <MemoryRouter>
        <Layout isAdmin hasPlayerProfile><div>Admin Player Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Schedina")).toBeInTheDocument();
    expect(screen.getByText("Classifica")).toBeInTheDocument();
    expect(screen.getByText("Profilo")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders the Golden tab for approved admins with a linked player profile", () => {
    render(
      <MemoryRouter>
        <Layout isAdmin hasPlayerProfile hasGoldenAccess><div>Admin Golden Content</div></Layout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /golden/i })).toHaveAttribute("href", "/golden-plus");
  });
});
