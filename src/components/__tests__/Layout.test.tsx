import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../Layout";

describe("Layout", () => {
  it("renders 5 bottom tabs", () => {
    render(
      <MemoryRouter>
        <Layout><div>Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Schedina")).toBeInTheDocument();
    expect(screen.getByText("Ranking")).toBeInTheDocument();
    expect(screen.getByText("Griglione")).toBeInTheDocument();
    expect(screen.getByText("Profilo")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <MemoryRouter>
        <Layout><div>Test Content</div></Layout>
      </MemoryRouter>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
