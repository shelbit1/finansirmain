"use client";

import { useState, type FormEvent } from "react";
import { ColorPicker, EmojiPicker } from "@/components/ui/IconColorPicker";

type AccountFormDto = {
  id: string;
  name: string;
  currency: string;
  balance: number | string;
  icon: string | null;
  color: string | null;
};

type Props = {
  account?: AccountFormDto;
  onSuccess: () => void;
};

export function AccountForm({ account, onSuccess }: Props) {
  const isEdit = Boolean(account);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      currency: String(fd.get("currency") ?? "RUB"),
      balance: Number(fd.get("balance") ?? 0),
      icon: String(fd.get("icon") ?? "💵"),
      color: String(fd.get("color") ?? "#3D7EFF"),
    };

    try {
      const url = isEdit ? `/api/accounts/${account!.id}` : "/api/accounts";
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
      <div>
        <label className="label">Название</label>
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={account?.name}
          placeholder="Например, Тинькофф"
          className="input"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Валюта</label>
          <select name="currency" defaultValue={account?.currency ?? "RUB"} className="input">
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
        <div>
          <label className="label">{isEdit ? "Баланс" : "Начальный баланс"}</label>
          <input
            name="balance"
            type="number"
            step="0.01"
            inputMode="decimal"
            defaultValue={String(account?.balance ?? 0)}
            className="input tnum"
          />
        </div>
      </div>

      <div>
        <label className="label">Иконка</label>
        <EmojiPicker name="icon" value={account?.icon ?? undefined} />
      </div>

      <div>
        <label className="label">Цвет</label>
        <ColorPicker name="color" value={account?.color ?? undefined} />
      </div>

      {error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать счёт"}
      </button>
    </form>
  );
}
