import type { ReactNode } from "react";
import { Feather } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, action, icon, compact }: EmptyStateProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center px-4 py-8 text-center"
          : "card flex flex-col items-center justify-center px-6 py-14 text-center"
      }
    >
      <span className="brand-mark mb-4" style={{ width: 44, height: 44 }}>
        {icon ?? <Feather size={20} strokeWidth={1.6} />}
      </span>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
