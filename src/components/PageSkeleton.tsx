import Skeleton from "./Skeleton";

/**
 * Full-page skeleton used as Suspense fallback while lazy routes load.
 */
export default function PageSkeleton() {
  return (
    <div className="space-y-5 animate-in" aria-busy="true" aria-label="Caricamento">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={180} height={24} />
          <Skeleton width={120} height={14} />
        </div>
        <Skeleton width={68} height={48} rounded="0.75rem" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={60} rounded="0.75rem" />
        ))}
      </div>
    </div>
  );
}
