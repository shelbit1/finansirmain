"use client";

import { Calendar, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { hasPaidAccess, type AccessTier } from "@/lib/access";
import type {
  AccountOption,
  CategoryOption,
} from "./TransactionForm";

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
  accountId: string;
  categoryId: string;
};

export const EMPTY_FILTER: FilterState = {
  type: "ALL",
  search: "",
  date: "",
  amountMin: "",
  amountMax: "",
  accountId: "",
  categoryId: "",
};

export function isFilterActive(f: FilterState): boolean {
  return (
    f.type !== "ALL" ||
    f.search.trim() !== "" ||
    f.date !== "" ||
    f.amountMin !== "" ||
    f.amountMax !== "" ||
    f.accountId !== "" ||
    f.categoryId !== ""
  );
}

/**
 * Сортировка категорий с учётом иерархии: каждая родительская идёт перед
 * своими потомками, дочерние помечаются глубиной для визуального отступа.
 */
function orderedCategories(
  categories: CategoryOption[],
): { item: CategoryOption; depth: number }[] {
  const idSet = new Set(categories.map((c) => c.id));
  const byParent = new Map<string, CategoryOption[]>();
  const roots: CategoryOption[] = [];
  for (const c of categories) {
    if (c.parentId && idSet.has(c.parentId)) {
      const arr = byParent.get(c.parentId) ?? [];
      arr.push(c);
      byParent.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }
  const out: { item: CategoryOption; depth: number }[] = [];
  for (const r of roots) {
    out.push({ item: r, depth: 0 });
    for (const k of byParent.get(r.id) ?? []) {
      out.push({ item: k, depth: 1 });
    }
  }
  return out;
}

export function TransactionsFilters({
  value,
  onChange,
  tier,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  tier: AccessTier;
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
}) {
  const paid = hasPaidAccess(tier);
  const visibleTabs = FILTER_TABS.filter((t) => paid || !t.paid);
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const setType = (t: TransactionFilter) => {
    // При смене типа сбрасываем категорию, если она больше не релевантна.
    const next: FilterState = { ...value, type: t };
    if (t !== "ALL" && t !== "INCOME" && t !== "EXPENSE") {
      next.categoryId = "";
    }
    onChange(next);
  };

  const showCategoryFilter =
    value.type === "ALL" || value.type === "INCOME" || value.type === "EXPENSE";
  const orderedIncome = orderedCategories(incomeCategories);
  const orderedExpense = orderedCategories(expenseCategories);

  return (
    <div className="space-y-3 mb-4">
      <ScrollableTabs>
        {visibleTabs.map((f) => (
          <button
            key={f.id}
            onClick={() => setType(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              value.type === f.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollableTabs>

      <div className="relative">
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

      <div className="grid grid-cols-2 sm:grid-cols-[auto_auto_1fr] gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value.amountMin}
          onChange={(e) => set("amountMin", e.target.value)}
          placeholder="Сумма от"
          aria-label="Минимальная сумма"
          className="input h-10 text-sm w-full sm:w-36 min-w-0"
        />
        <input
          type="number"
          inputMode="decimal"
          value={value.amountMax}
          onChange={(e) => set("amountMax", e.target.value)}
          placeholder="Сумма до"
          aria-label="Максимальная сумма"
          className="input h-10 text-sm w-full sm:w-36 min-w-0"
        />

        <div className="relative col-span-2 sm:col-span-1 sm:justify-self-end">
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

      <div
        className={cn(
          "grid gap-2",
          showCategoryFilter ? "sm:grid-cols-2" : "sm:grid-cols-1",
        )}
      >
        <select
          value={value.accountId}
          onChange={(e) => set("accountId", e.target.value)}
          aria-label="Фильтр по счёту"
          className={cn(
            "input h-10 text-sm",
            value.accountId && "border-primary/40",
          )}
        >
          <option value="">Все счета</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon ? `${a.icon} ${a.name}` : a.name}
            </option>
          ))}
        </select>

        {showCategoryFilter && (
          <select
            value={value.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            aria-label="Фильтр по статье"
            className={cn(
              "input h-10 text-sm",
              value.categoryId && "border-primary/40",
            )}
          >
            <option value="">Все статьи</option>
            {(value.type === "ALL" || value.type === "EXPENSE") &&
              orderedExpense.length > 0 && (
                <optgroup label="Расходы">
                  {orderedExpense.map(({ item, depth }) => (
                    <option key={`e-${item.id}`} value={item.id}>
                      {depth > 0 ? "— " : ""}
                      {item.icon ? `${item.icon} ${item.name}` : item.name}
                    </option>
                  ))}
                </optgroup>
              )}
            {(value.type === "ALL" || value.type === "INCOME") &&
              orderedIncome.length > 0 && (
                <optgroup label="Доходы">
                  {orderedIncome.map(({ item, depth }) => (
                    <option key={`i-${item.id}`} value={item.id}>
                      {depth > 0 ? "— " : ""}
                      {item.icon ? `${item.icon} ${item.name}` : item.name}
                    </option>
                  ))}
                </optgroup>
              )}
          </select>
        )}
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
