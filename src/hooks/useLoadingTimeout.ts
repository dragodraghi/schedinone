import { useEffect, useState } from "react";

/**
 * Returns `true` once `active` has stayed `true` continuously for `ms`.
 * Resets to `false` whenever `active` becomes `false`. Used to surface a
 * "slow connection / retry" affordance instead of an infinite spinner.
 */
export function useLoadingTimeout(active: boolean, ms = 12000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) {
      // Reset on a deferred tick so we never call setState synchronously in
      // the effect body (cascading-render lint rule).
      const reset = setTimeout(() => setTimedOut(false), 0);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);

  return timedOut;
}
