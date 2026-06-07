import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLoadingTimeout } from "../useLoadingTimeout";

describe("useLoadingTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("turns true after the timeout while active", () => {
    const { result } = renderHook(() => useLoadingTimeout(true, 1000));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);
  });

  it("stays false when loading finishes before the timeout", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useLoadingTimeout(active, 1000),
      { initialProps: { active: true } }
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ active: false });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);
  });
});
