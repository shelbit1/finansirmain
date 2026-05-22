"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryComboboxItem = {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
};

type Kind = "income" | "expense";

/**
 * Поиск по статьям с иерархией (родитель → дочерние с отступом) и
 * возможностью создать новую статью прямо из поля.
 *
 * Сабмит формы происходит через скрытый input с заданным `name`.
 */
export function CategoryCombobox({
  name,
  defaultValue = "",
  options,
  kind,
  placeholder = "Выберите статью",
  required = false,
}: {
  name: string;
  defaultValue?: string;
  options: CategoryComboboxItem[];
  kind: Kind;
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState<string>(defaultValue);
  const [items, setItems] = useState<CategoryComboboxItem[]>(options);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(options);
  }, [options]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeAndReset();
      }
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Дерево: сначала корневые, под каждым — её дочерние (отступ depth=1).
  const ordered = useMemo(() => {
    const byParent = new Map<string, CategoryComboboxItem[]>();
    const roots: CategoryComboboxItem[] = [];
    const idSet = new Set(items.map((i) => i.id));
    for (const it of items) {
      if (it.parentId && idSet.has(it.parentId)) {
        const arr = byParent.get(it.parentId) ?? [];
        arr.push(it);
        byParent.set(it.parentId, arr);
      } else {
        roots.push(it);
      }
    }
    const out: { item: CategoryComboboxItem; depth: number }[] = [];
    for (const r of roots) {
      out.push({ item: r, depth: 0 });
      for (const k of byParent.get(r.id) ?? []) {
        out.push({ item: k, depth: 1 });
      }
    }
    return out;
  }, [items]);

  const q = query.trim();
  const ql = q.toLowerCase();
  const filtered = useMemo(() => {
    if (!ql) return ordered;
    return ordered.filter(({ item }) => item.name.toLowerCase().includes(ql));
  }, [ordered, ql]);

  const exactMatch = filtered.some(
    ({ item }) => item.name.toLowerCase() === ql,
  );
  const canCreate = q.length > 0 && !exactMatch;

  const selected = items.find((it) => it.id === value);

  const closeAndReset = () => {
    setOpen(false);
    setQuery("");
    setHoverIdx(0);
    setCreateError(null);
  };

  const openAndFocus = () => {
    setOpen(true);
    setHoverIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (id: string) => {
    setValue(id);
    closeAndReset();
  };

  const create = async () => {
    const trimmed = q;
    if (!trimmed || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/categories/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Не удалось создать статью");
      }
      const data = (await res.json()) as {
        category: {
          id: string;
          name: string;
          icon: string | null;
          parentId: string | null;
        };
      };
      const created: CategoryComboboxItem = {
        id: data.category.id,
        name: data.category.name,
        icon: data.category.icon ?? null,
        parentId: data.category.parentId ?? null,
      };
      setItems((prev) => [...prev, created]);
      setValue(created.id);
      closeAndReset();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const totalRows = filtered.length + (canCreate ? 1 : 0);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAndReset();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (totalRows === 0) {
        if (canCreate) void create();
        return;
      }
      if (canCreate && hoverIdx === 0) {
        void create();
        return;
      }
      const itemIdx = canCreate ? hoverIdx - 1 : hoverIdx;
      const target = filtered[Math.max(0, Math.min(itemIdx, filtered.length - 1))];
      if (target) select(target.item.id);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(i + 1, Math.max(0, totalRows - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected?.name ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHoverIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onMouseDown={(e) => {
            if (!open) {
              e.preventDefault();
              openAndFocus();
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input pr-16"
          autoComplete="off"
        />

        {value && !open && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setValue("")}
            aria-label="Очистить"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          onClick={() => (open ? closeAndReset() : openAndFocus())}
          aria-label={open ? "Закрыть" : "Открыть"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted p-1"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-30 card shadow-lg border border-border py-1 max-h-72 overflow-y-auto"
        >
          {canCreate && (
            <button
              type="button"
              role="option"
              aria-selected={hoverIdx === 0}
              onMouseEnter={() => setHoverIdx(0)}
              onClick={() => void create()}
              disabled={creating}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-border",
                hoverIdx === 0 && "bg-primary/5",
              )}
            >
              <span className="inline-flex items-center gap-2 text-primary font-medium">
                <Plus className="w-3.5 h-3.5" />
                {creating ? "Создаём…" : `Создать «${q}»`}
              </span>
              <span className="text-xs text-text-muted">Enter</span>
            </button>
          )}

          {createError && (
            <p className="px-3 py-2 text-xs text-expense bg-expense/8 border-b border-border">
              {createError}
            </p>
          )}

          {filtered.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-sm text-text-muted italic">
              Ничего не найдено
            </div>
          )}

          {filtered.map((entry, i) => {
            const rowIdx = canCreate ? i + 1 : i;
            return (
              <button
                key={entry.item.id}
                type="button"
                role="option"
                aria-selected={rowIdx === hoverIdx}
                onMouseEnter={() => setHoverIdx(rowIdx)}
                onClick={() => select(entry.item.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                  rowIdx === hoverIdx && "bg-bg",
                  entry.depth === 1 && "pl-9 text-text-muted",
                )}
              >
                {entry.item.icon && (
                  <span className="text-base shrink-0">{entry.item.icon}</span>
                )}
                <span className="truncate">{entry.item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
