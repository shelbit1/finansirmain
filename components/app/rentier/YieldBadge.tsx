import { cn, formatPercentCompact } from "@/lib/utils";
import { yieldColor } from "@/lib/rentier";

export function YieldBadge({
  value,
  label,
  className,
}: {
  value: number | null | undefined;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tnum",
        yieldColor(value),
        className,
      )}
    >
      {value === null || value === undefined ? "—" : formatPercentCompact(value)}
      {label && <span className="font-medium opacity-80">{label}</span>}
    </span>
  );
}
