"use client";

import { useState, type FormEvent } from "react";
import type { DebtDirection } from "@prisma/client";
import { cn, toInputDate } from "@/lib/utils";

export type DebtDto = {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  description: string | null;
};

export function DebtForm({
  debt,
  onSuccess,
}: {
  debt?: DebtDto;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(debt);
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? "I_OWE");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const dueRaw = String(fd.get("dueDate") ?? "");
    const payload = {
      direction,
      personName: String(fd.get("personName") ?? ""),
      amount: Number(fd.get("amount") ?? 0),
      currency: String(fd.get("currency") ?? "RUB"),
      dueDate: dueRaw || null,
      description: String(fd.get("description") ?? "") || undefined,
    };

    try {
      const url = isEdit ? `/api/debts/${debt!.id}` : "/api/debts";
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection("I_OWE")}
          className={cn(
            "p-3 rounded-xl border-2 text-left",
            direction === "I_OWE"
              ? "border-debt-owe bg-debt-owe/10"
              : "border-border bg-bg",
          )}
        >
          <p className="font-medium text-debt-owe text-sm">Я должен</p>
          <p className="text-xs text-text-muted">занял у кого-то</p>
        </button>
        <button
          type="button"
          onClick={() => setDirection("OWED_TO_ME")}
          className={cn(
            "p-3 rounded-xl border-2 text-left",
            direction === "OWED_TO_ME"
              ? "border-debt-get bg-debt-get/10"
              : "border-border bg-bg",
          )}
        >
          <p className="font-medium text-debt-get text-sm">Мне должны</p>
          <p className="text-xs text-text-muted">дал в долг</p>
        </button>
      </div>

      <div>
        <label className="label">Имя человека</label>
        <input
          name="personName"
          required
          maxLength={80}
          defaultValue={debt?.personName}
          placeholder="Например, Иван"
          className="input"
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
            defaultValue={debt?.amount ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
        </div>
        <div>
          <label className="label">Валюта</label>
          <select name="currency" defaultValue={debt?.currency ?? "RUB"} className="input">
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Срок возврата (необязательно)</label>
        <input
          name="dueDate"
          type="date"
          defaultValue={debt?.dueDate ? toInputDate(debt.dueDate) : ""}
          className="input"
        />
      </div>

      <div>
        <label className="label">Описание</label>
        <input
          name="description"
          maxLength={500}
          defaultValue={debt?.description ?? ""}
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
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
      </button>
    </form>
  );
}
