import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-text-muted text-sm mb-5 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}
