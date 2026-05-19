"use client";

import { useState, type FormEvent } from "react";
import type { TransactionType } from "@prisma/client";
import { cn, toInputDate } from "@/lib/utils";
import {
  DEBT_LABELS,
  DEBT_TYPES,
  debtColor,
  isDebtType,
  type DebtType,
} from "@/lib/transactionMeta";

export type TransactionDto = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  interestAmount?: number | null;
};

export type AccountOption = { id: string; name: string; icon: string | null };
export type CategoryOption = { id: string; name: string; icon: string | null };

type TopTab = "INCOME" | "EXPENSE" | "TRANSFER" | "DEBT";

const TOP_TABS: { id: TopTab; label: string; color: string }[] = [
  { id: "INCOME", label: "Доход", color: "var(--color-income)" },
  { id: "EXPENSE", label: "Расход", color: "var(--color-expense)" },
  { id: "TRANSFER", label: "Перемещение", color: "var(--color-transfer)" },
  { id: "DEBT", label: "Долг", color: "var(--color-debt-owe)" },
];

function topTabForType(t: TransactionType): TopTab {
  if (isDebtType(t)) return "DEBT";
  if (t === "INCOME") return "INCOME";
  if (t === "TRANSFER") return "TRANSFER";
  return "EXPENSE";
}

export function TransactionForm({
  transaction,
  accounts,
  incomeCategories,
  expenseCategories,
  onSuccess,
}: {
  transaction?: TransactionDto;
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  onSuccess: () => void;
}) {
  const isEdit = Boolean(transaction);

  const [tab, setTab] = useState<TopTab>(
    transaction ? topTabForType(transaction.type) : "EXPENSE",
  );
  const [debtType, setDebtType] = useState<DebtType>(
    transaction && isDebtType(transaction.type) ? (transaction.type as DebtType) : "DEBT_TAKE",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveType: TransactionType =
    tab === "DEBT" ? debtType : (tab as TransactionType);
  const needsFromAccount =
    effectiveType === "EXPENSE" ||
    effectiveType === "TRANSFER" ||
    effectiveType === "DEBT_RETURN" ||
    effectiveType === "DEBT_GIVE";
  const needsToAccount =
    effectiveType === "INCOME" ||
    effectiveType === "TRANSFER" ||
    effectiveType === "DEBT_TAKE" ||
    effectiveType === "DEBT_RECEIVE";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type: effectiveType,
      amount: Number(fd.get("amount") ?? 0),
      date: String(fd.get("date") ?? new Date().toISOString().slice(0, 10)),
      note: String(fd.get("note") ?? "") || undefined,
      incomeCategoryId:
        effectiveType === "INCOME"
          ? String(fd.get("incomeCategoryId") ?? "") || null
          : null,
      expenseCategoryId:
        effectiveType === "EXPENSE"
          ? String(fd.get("expenseCategoryId") ?? "") || null
          : null,
      fromAccountId: needsFromAccount
        ? String(fd.get("fromAccountId") ?? "") || null
        : null,
      toAccountId: needsToAccount
        ? String(fd.get("toAccountId") ?? "") || null
        : null,
      interestAmount:
        effectiveType === "DEBT_RETURN"
          ? Number(fd.get("interestAmount") ?? 0) || 0
          : null,
    };

    try {
      const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Не удалось сохранить");
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  const accountsEmpty = accounts.length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-1 p-1 bg-bg border border-border rounded-xl">
        {TOP_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap",
              tab === t.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
            style={tab === t.id ? { color: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "DEBT" && (
        <div>
          <label className="label">Тип операции с долгом</label>
          <select
            value={debtType}
            onChange={(e) => setDebtType(e.target.value as DebtType)}
            className="input"
            style={{ color: debtColor(debtType) }}
          >
            {DEBT_TYPES.map((d) => (
              <option key={d} value={d}>
                {DEBT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">
            {effectiveType === "DEBT_RETURN" ? "Тело долга" : "Сумма"}
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={transaction?.amount ?? ""}
            placeholder="0,00"
            className="input tnum"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Дата</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={transaction ? toInputDate(transaction.date) : toInputDate(new Date())}
            className="input"
          />
        </div>
      </div>

      {effectiveType === "DEBT_RETURN" && (
        <div>
          <label className="label">% долга (попадёт в расходы)</label>
          <input
            name="interestAmount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={transaction?.interestAmount ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
          <p className="text-xs text-text-muted mt-1">
            Будет создана связанная операция расхода в категории «Проценты по долгу».
          </p>
        </div>
      )}

      {needsFromAccount && (
        <div>
          <label className="label">
            {effectiveType === "TRANSFER" ? "Откуда" : "Счёт списания"}
          </label>
          <select
            name="fromAccountId"
            required
            defaultValue={transaction?.fromAccountId ?? ""}
            className="input"
          >
            <option value="">Выберите счёт</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ?? ""} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsToAccount && (
        <div>
          <label className="label">
            {effectiveType === "TRANSFER" ? "Куда" : "Счёт зачисления"}
          </label>
          <select
            name="toAccountId"
            required
            defaultValue={transaction?.toAccountId ?? ""}
            className="input"
          >
            <option value="">Выберите счёт</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ?? ""} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveType === "INCOME" && (
        <div>
          <label className="label">Статья дохода</label>
          <select
            name="incomeCategoryId"
            required
            defaultValue={transaction?.incomeCategoryId ?? ""}
            className="input"
          >
            <option value="">Выберите статью</option>
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ?? ""} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveType === "EXPENSE" && (
        <div>
          <label className="label">Статья расхода</label>
          <select
            name="expenseCategoryId"
            required
            defaultValue={transaction?.expenseCategoryId ?? ""}
            className="input"
          >
            <option value="">Выберите статью</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ?? ""} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Заметка</label>
        <input
          name="note"
          type="text"
          maxLength={500}
          defaultValue={transaction?.note ?? ""}
          placeholder="Необязательно"
          className="input"
        />
      </div>

      {accountsEmpty && (
        <p className="text-text-muted text-sm bg-bg border border-border rounded-lg px-3 py-2">
          Сначала создайте хотя бы один счёт.
        </p>
      )}
      {error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || accountsEmpty}
        className="btn btn-primary w-full"
      >
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Добавить операцию"}
      </button>
    </form>
  );
}
