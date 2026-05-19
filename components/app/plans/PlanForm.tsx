"use client";

import { useState, type FormEvent } from "react";
import type { PlanType } from "@prisma/client";
import { cn, toInputDate } from "@/lib/utils";

export type PlanDto = {
  id: string;
  type: PlanType;
  title: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  note: string | null;
  completed: boolean;
};

const TYPES: { id: PlanType; label: string; color: string }[] = [
  { id: "PLAN_INCOME", label: "Доход", color: "var(--color-income)" },
  { id: "PLAN_EXPENSE", label: "Расход", color: "var(--color-expense)" },
];

export function PlanForm({
  plan,
  onSuccess,
}: {
  plan?: PlanDto;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(plan);
  const [type, setType] = useState<PlanType>(plan?.type ?? "PLAN_EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type,
      title: String(fd.get("title") ?? "").trim(),
      amount: Number(fd.get("amount") ?? 0),
      currency: String(fd.get("currency") ?? "RUB"),
      dueDate: String(fd.get("dueDate") ?? "") || null,
      note: String(fd.get("note") ?? "") || undefined,
    };

    try {
      const url = isEdit ? `/api/plans/${plan!.id}` : "/api/plans";
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 bg-bg border border-border rounded-xl">
        {TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setType(t.id)}
            className={cn(
              "py-2 rounded-lg text-sm font-medium",
              type === t.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
            style={type === t.id ? { color: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Название</label>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={plan?.title ?? ""}
          placeholder={type === "PLAN_INCOME" ? "Бонус по итогам квартала" : "Покупка ноутбука"}
          className="input"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Сумма</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={plan?.amount ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
        </div>
        <div>
          <label className="label">Срок</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={plan?.dueDate ? toInputDate(plan.dueDate) : ""}
            className="input"
          />
        </div>
      </div>

      <input type="hidden" name="currency" value={plan?.currency ?? "RUB"} />

      <div>
        <label className="label">Заметка</label>
        <input
          name="note"
          type="text"
          maxLength={500}
          defaultValue={plan?.note ?? ""}
          placeholder="Необязательно"
          className="input"
        />
      </div>

      {error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Добавить план"}
      </button>
    </form>
  );
}
