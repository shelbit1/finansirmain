"use client";

import { useState, type FormEvent } from "react";
import type { AssetType } from "@prisma/client";
import { ASSET_CATEGORIES, assetCategory } from "@/lib/assetTypes";
import { cn, toInputDate } from "@/lib/utils";

export type AssetDto = {
  id: string;
  name: string;
  type: AssetType;
  purchasePrice: number;
  currentValue: number;
  currency: string;
  purchaseDate: string | null;
  quantity: number | null;
  unit: string | null;
  description: string | null;
};

export function AssetForm({
  asset,
  onSuccess,
}: {
  asset?: AssetDto;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(asset);
  // Сводим устаревшие типы из БД (BUSINESS/STOCKS/…) к одной из трёх категорий
  const initialType: AssetType = asset ? assetCategory(asset.type) : "REAL_ESTATE";
  const [type, setType] = useState<AssetType>(initialType);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const qty = String(fd.get("quantity") ?? "");
    const payload = {
      type,
      name: String(fd.get("name") ?? ""),
      purchasePrice: Number(fd.get("purchasePrice") ?? 0),
      currentValue: Number(fd.get("currentValue") ?? 0),
      currency: String(fd.get("currency") ?? "RUB"),
      purchaseDate: String(fd.get("purchaseDate") ?? ""),
      quantity: qty ? Number(qty) : undefined,
      unit: String(fd.get("unit") ?? "") || undefined,
      description: String(fd.get("description") ?? "") || undefined,
    };

    try {
      const url = isEdit ? `/api/assets/${asset!.id}` : "/api/assets";
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
        <label className="label">Тип актива</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ASSET_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setType(c.id)}
              className={cn(
                "px-3 py-2.5 rounded-lg border text-sm font-medium",
                type === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-bg text-text-muted hover:text-text",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Название</label>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={asset?.name}
          placeholder="Квартира на Ленина / BTC / Tesla"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Цена покупки</label>
          <input
            name="purchasePrice"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={asset?.purchasePrice ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
        </div>
        <div>
          <label className="label">Текущая стоимость</label>
          <input
            name="currentValue"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={asset?.currentValue ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Валюта</label>
          <select name="currency" defaultValue={asset?.currency ?? "RUB"} className="input">
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>
        <div>
          <label className="label">Дата покупки</label>
          <input
            name="purchaseDate"
            type="date"
            required
            defaultValue={asset?.purchaseDate ? toInputDate(asset.purchaseDate) : ""}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Количество</label>
          <input
            name="quantity"
            type="number"
            step="0.0001"
            min="0"
            inputMode="decimal"
            defaultValue={asset?.quantity ?? ""}
            placeholder="Например, 0.5"
            className="input tnum"
          />
        </div>
        <div>
          <label className="label">Единица</label>
          <input
            name="unit"
            maxLength={20}
            defaultValue={asset?.unit ?? ""}
            placeholder="шт, м², BTC…"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Описание</label>
        <input
          name="description"
          maxLength={500}
          defaultValue={asset?.description ?? ""}
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
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать актив"}
      </button>
    </form>
  );
}
