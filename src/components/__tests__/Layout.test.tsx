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
});
