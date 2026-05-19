"use client";

import { useState, type FormEvent } from "react";
import { ColorPicker, EmojiPicker } from "@/components/ui/IconColorPicker";

export type CategoryDto = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export function CategoryForm({
  kind,
  category,
  onSuccess,
}: {
  kind: "income" | "expense";
  category?: CategoryDto;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(category);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const defaultEmoji = kind === "income" ? "💰" : "🛒";
  const defaultColor = kind === "income" ? "#22C55E" : "#EF4444";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      icon: String(fd.get("icon") ?? defaultEmoji),
      color: String(fd.get("color") ?? defaultColor),
    };

    try {
      const url = isEdit
        ? `/api/categories/${kind}/${category!.id}`
        : `/api/categories/${kind}`;
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
          defaultValue={category?.name}
          placeholder={kind === "income" ? "Зарплата, фриланс…" : "Продукты, кафе…"}
          className="input"
          autoFocus
        />
      </div>

      <div>
        <label className="label">Иконка</label>
        <EmojiPicker
          name="icon"
          value={category?.icon ?? undefined}
          defaultValue={defaultEmoji}
        />
      </div>

      <div>
        <label className="label">Цвет</label>
        <ColorPicker
          name="color"
          value={category?.color ?? undefined}
          defaultValue={defaultColor}
        />
      </div>

      {error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать категорию"}
      </button>
    </form>
  );
}
