import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OfflineBanner from "../OfflineBanner";

describe("OfflineBanner", () => {
  afterEach(() => {
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
  });

  it("shows the offline bar only while offline", () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(/sei offline/i)).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/sei offline/i)).toBeInTheDocument();
  });

  it("confirms when the connection returns", () => {
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByText(/sei offline/i)).not.toBeInTheDocument();
    expect(screen.getByText(/di nuovo online/i)).toBeInTheDocument();
  });
});
