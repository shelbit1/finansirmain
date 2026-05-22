"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, toInputDate } from "@/lib/utils";
import { isDebtType } from "@/lib/transactionMeta";
import { type AccessTier } from "@/lib/access";
import {
  TransactionForm,
  TRANSACTION_MODAL_MAX_WIDTH,
  type AccountOption,
  type CategoryOption,
  type DebtOption,
  type TransactionDto,
} from "./TransactionForm";
import {
  EMPTY_FILTER,
  TransactionsFilters,
  type FilterState,
} from "./TransactionsFilters";
import { TransactionsTable } from "./TransactionsTable";

export type TransactionWithRefs = TransactionDto & {
  incomeCategory: CategoryOption | null;
  expenseCategory: CategoryOption | null;
  fromAccount: (AccountOption & { currency: string }) | null;
  toAccount: (AccountOption & { currency: string }) | null;
};

function matchesSearch(t: TransactionWithRefs, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    t.note ?? "",
    t.personName ?? "",
    t.assetName ?? "",
    t.incomeCategory?.name ?? "",
    t.expenseCategory?.name ?? "",
    t.fromAccount?.name ?? "",
    t.toAccount?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function applyFilter(
  items: TransactionWithRefs[],
  filter: FilterState,
): TransactionWithRefs[] {
  const min = filter.amountMin ? Number(filter.amountMin) : null;
  const max = filter.amountMax ? Number(filter.amountMax) : null;
  return items.filter((t) => {
    if (filter.type !== "ALL") {
      if (filter.type === "DEBT" && !isDebtType(t.type)) return false;
      if (filter.type !== "DEBT" && t.type !== filter.type) return false;
    }
    if (filter.date && toInputDate(t.date) !== filter.date) return false;
    if (min !== null && !Number.isNaN(min) && t.amount < min) return false;
    if (max !== null && !Number.isNaN(max) && t.amount > max) return false;
    if (!matchesSearch(t, filter.search)) return false;
    return true;
  });
}

export function TransactionsList({
  items,
  accounts,
  incomeCategories,
  expenseCategories,
  debts,
  personNames = [],
  tier = "PAID",
}: {
  items: TransactionWithRefs[];
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  debts: DebtOption[];
  personNames?: string[];
  tier?: AccessTier;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRefs | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRefs | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);

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
        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Новая операция"
          maxWidth={TRANSACTION_MODAL_MAX_WIDTH}
        >
          <TransactionForm
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            debts={debts}
            personNames={personNames}
            tier={tier}
            onSuccess={refresh}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <TransactionsFilters value={filter} onChange={setFilter} tier={tier} />

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-text-muted text-sm">
            {filter.date
              ? `На ${formatDate(filter.date)} операций нет`
              : "Не нашли операций по фильтру"}
          </p>
          <button
            type="button"
            onClick={() => setFilter(EMPTY_FILTER)}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <TransactionsTable
          items={filtered}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Новая операция"
        maxWidth={TRANSACTION_MODAL_MAX_WIDTH}
      >
        <TransactionForm
          accounts={accounts}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          debts={debts}
          personNames={personNames}
          tier={tier}
          onSuccess={refresh}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование операции"
        maxWidth={TRANSACTION_MODAL_MAX_WIDTH}
      >
        {editing && (
          <TransactionForm
            transaction={editing}
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            debts={debts}
            personNames={personNames}
            tier={tier}
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
  personNames = [],
  tier = "PAID",
}: {
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  debts: DebtOption[];
  personNames?: string[];
  tier?: AccessTier;
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
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая операция"
        maxWidth={TRANSACTION_MODAL_MAX_WIDTH}
      >
        <TransactionForm
          accounts={accounts}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          debts={debts}
          personNames={personNames}
          tier={tier}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
