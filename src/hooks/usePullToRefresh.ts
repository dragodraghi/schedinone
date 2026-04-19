import { useEffect, useRef, useState } from "react";

interface Options {
  /** Pixel distance the user must drag before triggering refresh. */
  threshold?: number;
  /** Called when the user pulls past the threshold and releases. */
  onRefresh: () => void | Promise<void>;
  /** Disable (e.g. when not on mobile). */
  enabled?: boolean;
}

/**
 * iOS/Android-style pull-to-refresh.
 * Returns `pull` (current pull distance px, 0..threshold*1.5) and `refreshing` flag.
 * Only activates when scroll is at top (scrollY === 0).
 */
export function usePullToRefresh({ threshold = 72, onRefresh, enabled = true }: Options) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    // Only enable on coarse pointer (touch) devices
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (!coarse) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      if (refreshing) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) return;
      if (window.scrollY > 0) {
        // User scrolled back up; cancel gesture
        activeRef.current = false;
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band resistance after threshold
      const resisted = delta < threshold ? delta : threshold + (delta - threshold) * 0.4;
      setPull(Math.min(resisted, threshold * 1.5));
    };

    const onTouchEnd = async () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      const distance = pull;
      startYRef.current = null;
      if (distance >= threshold) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, threshold, onRefresh, refreshing, pull]);

  return { pull, refreshing, threshold };
}
