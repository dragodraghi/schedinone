interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/**
 * Shimmer placeholder. Use for content that's loading.
 */
export default function Skeleton({ className = "", width, height, rounded = "0.5rem" }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded,
      }}
    />
  );
}
