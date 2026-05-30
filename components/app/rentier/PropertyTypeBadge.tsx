import type { RentierPropertyType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS } from "@/lib/rentier";

/** Компактный бейдж типа объекта без эмодзи — аббревиатура в рамке. */
export function PropertyTypeBadge({
  type,
  showLabel = false,
  className,
}: {
  type: RentierPropertyType;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = PROPERTY_TYPE_LABELS[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      <span className="shrink-0 font-semibold text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-border bg-bg text-text-muted">
        {meta.abbr}
      </span>
      {showLabel && (
        <span className="text-xs text-text-muted truncate">{meta.label}</span>
      )}
    </span>
  );
}
