"use client";

import { Calendar, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { hasPaidAccess, type AccessTier } from "@/lib/access";

export type TransactionFilter =
  | "ALL"
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "DEBT"
  | "ASSET_BUY";

const FILTER_TABS: { id: TransactionFilter; label: string; paid?: boolean }[] = [
  { id: "ALL", label: "Все" },
  { id: "INCOME", label: "Доходы" },
  { id: "EXPENSE", label: "Расходы" },
  { id: "DEBT", label: "Долги", paid: true },
  { id: "ASSET_BUY", label: "Активы", paid: true },
  { id: "TRANSFER", label: "Перемещения" },
];

export type FilterState = {
  type: TransactionFilter;
  search: string;
  date: string;
  amountMin: string;
  amountMax: string;
};

export const EMPTY_FILTER: FilterState = {
  type: "ALL",
  search: "",
  date: "",
  amountMin: "",
  amountMax: "",
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.type !== "ALL" ||
    f.search.trim() !== "" ||
    f.date !== "" ||
    f.amountMin !== "" ||
    f.amountMax !== ""
  );
}

export function TransactionsFilters({
  value,
  onChange,
  tier,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  tier: AccessTier;
}) {
  const paid = hasPaidAccess(tier);
  const visibleTabs = FILTER_TABS.filter((t) => paid || !t.paid);
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3 mb-4">
      <ScrollableTabs>
        {visibleTabs.map((f) => (
          <button
            key={f.id}
            onClick={() => set("type", f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              value.type === f.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollableTabs>

      <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
        <div className="relative col-span-2 sm:col-span-1">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="text"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Поиск по операциям"
            aria-label="Поиск по операциям"
            className="input pl-9 h-10 text-sm"
          />
          {value.search && (
            <button
              type="button"
              onClick={() => set("search", "")}
              aria-label="Очистить поиск"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <input
          type="number"
          inputMode="decimal"
          value={value.amountMin}
          onChange={(e) => set("amountMin", e.target.value)}
          placeholder="Сумма от"
          aria-label="Минимальная сумма"
          className="input h-10 text-sm w-full sm:w-32"
        />
        <input
          type="number"
          inputMode="decimal"
          value={value.amountMax}
          onChange={(e) => set("amountMax", e.target.value)}
          placeholder="Сумма до"
          aria-label="Максимальная сумма"
          className="input h-10 text-sm w-full sm:w-32"
        />

        <div className="relative col-span-2 sm:col-span-1">
          <Calendar
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="date"
            value={value.date}
            onChange={(e) => set("date", e.target.value)}
            aria-label="Фильтр по дате"
            className={cn(
              "input pl-9 h-10 text-sm w-full sm:w-[12rem]",
              value.date && "border-primary/40",
            )}
          />
        </div>
      </div>

      {isFilterActive(value) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text font-medium"
        >
          <X className="w-3 h-3" />
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}
