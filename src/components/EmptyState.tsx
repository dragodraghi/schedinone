import { type ReactNode } from "react";

interface Props {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: "blue" | "gold" | "muted";
}

const accentColors: Record<NonNullable<Props["accent"]>, string> = {
  blue: "var(--accent)",
  gold: "var(--gold)",
  muted: "var(--text-muted)",
};

export default function EmptyState({ icon, title, description, action, accent = "muted" }: Props) {
  const color = accentColors[accent];
  return (
    <div
      className="glass rounded-2xl p-8 text-center animate-in flex flex-col items-center gap-2"
      role="status"
    >
      <div
        className="text-5xl mb-2"
        style={{ filter: `drop-shadow(0 0 12px ${color === "var(--text-muted)" ? "rgba(100,116,139,0.3)" : color})` }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3
        className="text-base font-black"
        style={{ fontFamily: "Outfit, sans-serif", color }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
