"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import type { RentierPropertyStatus, RentierPropertyType } from "@prisma/client";
import { PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/rentier";
import { cn } from "@/lib/utils";

const STATUS_VALUES = Object.keys(
  PROPERTY_STATUS_LABELS,
) as RentierPropertyStatus[];
const TYPE_VALUES = Object.keys(PROPERTY_TYPE_LABELS) as RentierPropertyType[];

function buildHref(
  base: { status?: string; type?: string },
  patch: Partial<{ status?: string; type?: string }>,
) {
  const params = new URLSearchParams();
  const status = "status" in patch ? patch.status : base.status;
  const type = "type" in patch ? patch.type : base.type;
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  const qs = params.toString();
  return `/rentier/properties${qs ? `?${qs}` : ""}`;
}

export function PropertiesFilters({
  status,
  type,
}: {
  status?: string;
  type?: string;
}) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<"status" | "type" | null>(null);
  const base = { status, type };
  const go = (patch: Partial<{ status?: string; type?: string }>) => {
    router.push(buildHref(base, patch));
  };

  const statusLabel = status
    ? (PROPERTY_STATUS_LABELS[status as RentierPropertyStatus]?.label ?? "Статус")
    : "Все статусы";
  const typeLabel = type
    ? (PROPERTY_TYPE_LABELS[type as RentierPropertyType]?.abbr ?? "Тип")
    : "Все типы";

  return (
    <div className="card p-2.5 sm:p-3 mb-4 flex items-center gap-2 w-fit max-w-full">
      <FilterDropdown
        label={statusLabel}
        active={!!status}
        open={openMenu === "status"}
        onOpenChange={(open) => setOpenMenu(open ? "status" : null)}
        allLabel="Все статусы"
        activeValue={status}
        onSelect={(next) => go({ status: next })}
        options={STATUS_VALUES.map((s) => ({
          value: s,
          label: PROPERTY_STATUS_LABELS[s].label,
        }))}
      />
      <FilterDropdown
        label={typeLabel}
        active={!!type}
        open={openMenu === "type"}
        onOpenChange={(open) => setOpenMenu(open ? "type" : null)}
        allLabel="Все типы"
        activeValue={type}
        onSelect={(next) => go({ type: next })}
        options={TYPE_VALUES.map((t) => ({
          value: t,
          label: PROPERTY_TYPE_LABELS[t].label,
          hint: PROPERTY_TYPE_LABELS[t].abbr,
        }))}
      />
    </div>
  );
}

type FilterOption = { value: string; label: string; hint?: string };

function FilterDropdown({
  label,
  active,
  open,
  onOpenChange,
  allLabel,
  activeValue,
  onSelect,
  options,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allLabel: string;
  activeValue?: string;
  onSelect: (value: string | undefined) => void;
  options: FilterOption[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, [open, onOpenChange]);

  const pick = (next: string | undefined) => {
    onSelect(next);
    onOpenChange(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-sm font-medium border border-border bg-bg transition-colors",
          active ? "text-text border-primary/40" : "text-text-muted hover:text-text",
        )}
      >
        <span className="max-w-[6.5rem] sm:max-w-[8rem] truncate">{label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 w-64 max-h-72 overflow-y-auto card shadow-lg border border-border py-1"
        >
          <li role="option" aria-selected={!activeValue}>
            <button
              type="button"
              onClick={() => pick(undefined)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg",
                !activeValue && "text-text font-medium",
              )}
            >
              {!activeValue ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {allLabel}
            </button>
          </li>
          {options.map((opt) => {
            const selected = activeValue === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg",
                    selected && "text-text font-medium",
                  )}
                >
                  {selected ? (
                    <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  {opt.hint ? (
                    <span>
                      <span className="font-semibold">{opt.hint}</span>
                      <span className="text-text-muted"> · {opt.label}</span>
                    </span>
                  ) : (
                    opt.label
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
