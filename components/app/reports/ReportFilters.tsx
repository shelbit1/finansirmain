"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn, toInputDate } from "@/lib/utils";
import type { ReportGranularity } from "@/lib/reportBuilder";

const PRESETS: { id: string; label: string; range: () => { from: Date; to: Date } }[] = [
  {
    id: "month",
    label: "Этот месяц",
    range: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
  {
    id: "prev-month",
    label: "Прошлый месяц",
    range: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    },
  },
  {
    id: "quarter",
    label: "3 месяца",
    range: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
  {
    id: "ytd",
    label: "С начала года",
    range: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      };
    },
  },
  {
    id: "year",
    label: "Год",
    range: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1),
        to: now,
      };
    },
  },
];

const GRANULARITIES: { id: ReportGranularity; label: string }[] = [
  { id: "day", label: "По дням" },
  { id: "week", label: "По неделям" },
  { id: "month", label: "По месяцам" },
];

export function ReportFilters({
  from,
  to,
  granularity,
}: {
  from: string;
  to: string;
  granularity: ReportGranularity;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const apply = (next: { from?: string; to?: string; granularity?: ReportGranularity }) => {
    const params = new URLSearchParams();
    params.set("from", next.from ?? from);
    params.set("to", next.to ?? to);
    params.set("granularity", next.granularity ?? granularity);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  };

  const matchesPreset = (preset: (typeof PRESETS)[number]): boolean => {
    const r = preset.range();
    return toInputDate(r.from) === from && toInputDate(r.to) === to;
  };

  return (
    <div className="card p-3 sm:p-4 mb-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              const r = p.range();
              apply({ from: toInputDate(r.from), to: toInputDate(r.to) });
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border",
              matchesPreset(p)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-bg text-text-muted hover:text-text",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium border inline-flex items-center gap-1.5",
            customOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-bg text-text-muted hover:text-text",
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Свой период
        </button>
      </div>

      {customOpen && (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2 pt-2 border-t border-border">
          <div className="min-w-0">
            <label className="label">С</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="input"
            />
          </div>
          <div className="min-w-0">
            <label className="label">По</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="input"
            />
          </div>
          <button
            onClick={() => apply({ from: customFrom, to: customTo })}
            disabled={pending}
            className="btn btn-primary col-span-2 sm:col-span-1"
          >
            Применить
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
        <span className="text-xs text-text-muted">Отображение</span>
        <ScrollableTabs>
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              onClick={() => apply({ granularity: g.id })}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap",
                granularity === g.id ? "bg-surface shadow-sm" : "text-text-muted",
              )}
            >
              {g.label}
            </button>
          ))}
        </ScrollableTabs>
      </div>
    </div>
  );
}
