/**
 * Thin wrapper over navigator.vibrate. No-ops where unsupported (desktop, iOS Safari).
 * Respects prefers-reduced-motion.
 */

type HapticPattern = "tap" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [12, 50, 18],
  error: [30, 40, 30],
};

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function vibrate(kind: HapticPattern = "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (reducedMotion()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw if vibrate is disallowed — ignore
  }
}
