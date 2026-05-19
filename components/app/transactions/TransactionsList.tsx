"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  HandCoins,
  Inbox,
} from "lucide-react";
import type { TransactionType } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn, formatDateShort, formatMoney } from "@/lib/utils";
import {
  DEBT_LABELS,
  debtColor,
  debtSign,
  isDebtType,
  type DebtType,
} from "@/lib/transactionMeta";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
  type DebtOption,
  type TransactionDto,
} from "./TransactionForm";

export type TransactionWithRefs = TransactionDto & {
  incomeCategory: CategoryOption | null;
  expenseCategory: CategoryOption | null;
  fromAccount: (AccountOption & { currency: string }) | null;
  toAccount: (AccountOption & { currency: string }) | null;
};

type TypeConfig = {
  icon: typeof ArrowDown;
  color: string;
  sign: "+" | "−" | "";
  label: string;
};

const BASE_CONFIG: Record<"INCOME" | "EXPENSE" | "TRANSFER", TypeConfig> = {
  INCOME: { icon: ArrowDown, color: "var(--color-income)", sign: "+", label: "Доход" },
  EXPENSE: { icon: ArrowUp, color: "var(--color-expense)", sign: "−", label: "Расход" },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "var(--color-transfer)",
    sign: "",
    label: "Перемещение",
  },
};

function getTypeConfig(t: TransactionType): TypeConfig {
  if (isDebtType(t)) {
    return {
      icon: HandCoins,
      color: debtColor(t as DebtType),
      sign: debtSign(t as DebtType),
      label: DEBT_LABELS[t as DebtType],
    };
  }
  return BASE_CONFIG[t as "INCOME" | "EXPENSE" | "TRANSFER"];
}

type Filter = "ALL" | "INCOME" | "EXPENSE" | "TRANSFER" | "DEBT";

const FILTER_TABS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Все" },
  { id: "INCOME", label: "Доходы" },
  { id: "EXPENSE", label: "Расходы" },
  { id: "DEBT", label: "Долги" },
  { id: "TRANSFER", label: "Перемещения" },
];

export function TransactionsList({
  items,
  accounts,
  incomeCategories,
  expenseCategories,
  debts,
}: {
  items: TransactionWithRefs[];
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  debts: DebtOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRefs | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRefs | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "DEBT") return items.filter((i) => isDebtType(i.type));
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await fetch(`/api/transactions/${deleting.id}`, { method: "DELETE" });
      refresh();
    } finally {
      setDeletePending(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={Inbox}
          title="Операций пока нет"
          description="Добавьте первый доход или расход — балансы пересчитаются автоматически"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить операцию
            </button>
          }
        />
        <Modal open={creating} onClose={() => setCreating(false)} title="Новая операция">
          <TransactionForm
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            debts={debts}
            onSuccess={refresh}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <ScrollableTabs className="mb-4">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              filter === f.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollableTabs>

      <div className="card divide-y divide-border">
        {filtered.map((t) => {
          const conf = getTypeConfig(t.type);
          const Icon = conf.icon;
          const category = t.incomeCategory ?? t.expenseCategory;
          const isDebt = isDebtType(t.type);
          const accountName = isDebt
            ? t.toAccount?.name ?? t.fromAccount?.name ?? ""
            : t.type === "INCOME"
            ? t.toAccount?.name
            : t.type === "EXPENSE"
            ? t.fromAccount?.name
            : `${t.fromAccount?.name ?? "?"} → ${t.toAccount?.name ?? "?"}`;
          const title = isDebt
            ? t.personName ?? conf.label
            : category?.name ??
              (t.type === "TRANSFER" ? "Перемещение" : "Без категории");
          const accountLabel = isDebt
            ? [conf.label, accountName].filter(Boolean).join(" · ")
            : accountName;
          const currency =
            t.toAccount?.currency ?? t.fromAccount?.currency ?? "RUB";

          return (
            <div
              key={t.id}
              className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-bg/60 first:rounded-t-xl last:rounded-b-xl"
            >
              <button
                type="button"
                onClick={() => setEditing(t)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                aria-label="Редактировать операцию"
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${conf.color} 14%, transparent)`,
                  }}
                >
                  {!isDebt && category?.icon ? (
                    <span className="text-lg">{category.icon}</span>
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: conf.color }} />
                  )}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{title}</span>
                  <span className="block text-xs text-text-muted truncate">
                    {accountLabel}
                    {t.note ? ` · ${t.note}` : ""}
                  </span>
                </span>

                <span className="text-right shrink-0">
                  <span
                    className="block font-semibold tnum text-sm sm:text-base"
                    style={{ color: conf.color }}
                  >
                    {conf.sign}
                    {formatMoney(t.amount, currency)}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {formatDateShort(t.date)}
                  </span>
                </span>
              </button>

              <button
                onClick={() => setDeleting(t)}
                aria-label="Удалить операцию"
                className="p-2 text-text-muted hover:text-expense rounded-lg shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новая операция">
        <TransactionForm
          accounts={accounts}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          debts={debts}
          onSuccess={refresh}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование операции"
      >
        {editing && (
          <TransactionForm
            transaction={editing}
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            debts={debts}
            onSuccess={refresh}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить операцию?"
      >
        <p className="text-text-muted text-sm mb-4">
          Операция будет удалена, балансы счетов пересчитаются.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setDeleting(null)} className="btn btn-ghost flex-1">
            Отмена
          </button>
          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="btn btn-danger flex-1"
          >
            {deletePending ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function AddTransactionButton({
  accounts,
  incomeCategories,
  expenseCategories,
  debts,
}: {
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  debts: DebtOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Добавить операцию</span>
        <span className="sm:hidden">Добавить</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новая операция">
        <TransactionForm
          accounts={accounts}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          debts={debts}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
