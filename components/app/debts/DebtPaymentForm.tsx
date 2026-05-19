"use client";

import { useState, type FormEvent } from "react";
import { toInputDate } from "@/lib/utils";

export function DebtPaymentForm({
  debtId,
  remaining,
  onSuccess,
}: {
  debtId: string;
  remaining: number;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      amount: Number(fd.get("amount") ?? 0),
      date: String(fd.get("date") ?? new Date().toISOString().slice(0, 10)),
      note: String(fd.get("note") ?? "") || undefined,
    };

    try {
      const res = await fetch(`/api/debts/${debtId}/payments`, {
        method: "POST",
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Сумма платежа</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            placeholder="0,00"
            defaultValue={remaining > 0 ? remaining : ""}
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
            defaultValue={toInputDate(new Date())}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Заметка</label>
        <input
          name="note"
          maxLength={500}
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
        {pending ? "Сохраняем…" : "Зафиксировать платёж"}
      </button>
    </form>
  );
}
