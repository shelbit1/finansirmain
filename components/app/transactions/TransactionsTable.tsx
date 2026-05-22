"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { TransactionType } from "@prisma/client";
import { cn, formatMoney, toInputDate } from "@/lib/utils";
import { isDebtType } from "@/lib/transactionMeta";
import type { TransactionWithRefs } from "./TransactionsList";

/** Возвращает направление движения денег по типу операции. */
function flow(type: TransactionType): "in" | "out" | "between" {
  if (type === "INCOME" || type === "DEBT_TAKE" || type === "DEBT_RECEIVE")
    return "in";
  if (type === "TRANSFER") return "between";
  return "out";
}

/** Цвет иконки-стрелки в колонке «Тип». */
function arrowColor(type: TransactionType): string {
  if (type === "INCOME") return "var(--color-income)";
  if (type === "EXPENSE") return "var(--color-expense)";
  if (type === "TRANSFER") return "var(--color-transfer)";
  if (type === "DEBT_TAKE" || type === "DEBT_RETURN")
    return "var(--color-debt-owe)";
  if (type === "DEBT_GIVE" || type === "DEBT_RECEIVE")
    return "var(--color-debt-get)";
  return "var(--color-asset)";
}

/** Цвет суммы (как у стрелки, но для transfer — нейтральный). */
function amountColor(type: TransactionType): string {
  if (type === "TRANSFER") return "var(--color-transfer)";
  return arrowColor(type);
}

function amountSign(type: TransactionType): "+" | "−" | "" {
  const f = flow(type);
  if (f === "in") return "+";
  if (f === "out") return "−";
  return "";
}

function ArrowIcon({
  type,
  className,
}: {
  type: TransactionType;
  className?: string;
}) {
  const Icon =
    flow(type) === "in"
      ? ArrowDownLeft
      : flow(type) === "out"
        ? ArrowUpRight
        : ArrowLeftRight;
  return (
    <Icon
      className={cn("w-4 h-4", className)}
      style={{ color: arrowColor(type) }}
    />
  );
}

type Group = {
  key: string;
  label: string;
  items: TransactionWithRefs[];
};

function groupByDate(items: TransactionWithRefs[]): Group[] {
  const today = toInputDate(new Date());
  const yesterday = toInputDate(new Date(Date.now() - 86_400_000));
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "short",
  });

  const map = new Map<string, TransactionWithRefs[]>();
  for (const t of items) {
    const key = toInputDate(t.date);
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, arr]) => {
      const label =
        key === today
          ? "Сегодня"
          : key === yesterday
            ? "Вчера"
            : fmt.format(new Date(key + "T00:00:00"));
      return { key, label, items: arr };
    });
}

function rowMeta(t: TransactionWithRefs): {
  accountText: string;
  titleText: string;
} {
  const category = t.incomeCategory ?? t.expenseCategory;
  const isDebt = isDebtType(t.type);
  const isAsset = t.type === "ASSET_BUY";

  let accountText = "";
  if (t.type === "TRANSFER") {
    accountText = `${t.fromAccount?.name ?? "?"} → ${t.toAccount?.name ?? "?"}`;
  } else if (
    t.type === "INCOME" ||
    t.type === "DEBT_TAKE" ||
    t.type === "DEBT_RECEIVE"
  ) {
    accountText = t.toAccount?.name ?? "—";
  } else {
    accountText = t.fromAccount?.name ?? "—";
  }

  let titleText = "";
  if (isDebt) titleText = t.personName ?? "Долг";
  else if (isAsset) titleText = t.assetName ?? "Актив";
  else if (t.type === "TRANSFER") titleText = "Перемещение";
  else titleText = category?.name ?? "Без категории";

  return { accountText, titleText };
}

export function TransactionsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: TransactionWithRefs[];
  onEdit: (t: TransactionWithRefs) => void;
  onDelete: (t: TransactionWithRefs) => void;
}) {
  const groups = useMemo(() => groupByDate(items), [items]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, [openMenu]);

  return (
    <div className="card overflow-hidden">
      {/* Заголовок таблицы — только на десктопе */}
      <div className="hidden md:grid grid-cols-[120px_minmax(0,1.2fr)_60px_minmax(0,1.4fr)_minmax(0,1fr)_140px_40px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-text-muted uppercase tracking-wide">
        <span>Дата</span>
        <span>Счёт</span>
        <span className="text-center">Тип</span>
        <span>Категория / контрагент</span>
        <span>Примечание</span>
        <span className="text-right">Сумма</span>
        <span></span>
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <div className="bg-bg/60 px-3 sm:px-4 py-1.5 text-xs font-semibold text-text-muted">
            {g.label}
          </div>
          {g.items.map((t) => {
            const { accountText, titleText } = rowMeta(t);
            const currency =
              t.toAccount?.currency ?? t.fromAccount?.currency ?? "RUB";
            const sign = amountSign(t.type);
            const color = amountColor(t.type);
            const isOpen = openMenu === t.id;

            return (
              <div
                key={t.id}
                className="group border-b border-border last:border-b-0 hover:bg-bg/50 cursor-pointer"
                onClick={() => onEdit(t)}
              >
                {/* ── Мобильный макет: компактная карточка из двух строк ── */}
                <div className="md:hidden flex items-start gap-3 px-3 py-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${arrowColor(t.type)} 12%, transparent)`,
                    }}
                  >
                    <ArrowIcon type={t.type} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {titleText}
                      </p>
                      <p
                        className="text-sm font-semibold tnum whitespace-nowrap shrink-0"
                        style={{ color }}
                      >
                        {sign}
                        {formatMoney(t.amount, currency)}
                      </p>
                    </div>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {accountText}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>

                  <RowMenuButton
                    isOpen={isOpen}
                    onToggle={(e) => {
                      e.stopPropagation();
                      setOpenMenu((id) => (id === t.id ? null : t.id));
                    }}
                    menuRef={isOpen ? menuRef : undefined}
                    onEdit={() => {
                      setOpenMenu(null);
                      onEdit(t);
                    }}
                    onDelete={() => {
                      setOpenMenu(null);
                      onDelete(t);
                    }}
                    extraButtonClass="self-start -mr-1 -mt-1"
                  />
                </div>

                {/* ── Десктопный макет: табличная сетка ── */}
                <div className="hidden md:grid grid-cols-[120px_minmax(0,1.2fr)_60px_minmax(0,1.4fr)_minmax(0,1fr)_140px_40px] items-center gap-3 px-4 py-3">
                  <span className="text-xs text-text-muted tnum truncate">
                    {toInputDate(t.date).split("-").reverse().join(".")}
                  </span>
                  <span className="min-w-0 truncate text-sm">
                    {accountText}
                  </span>
                  <span className="inline-flex items-center justify-center">
                    <ArrowIcon type={t.type} />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {titleText}
                  </span>
                  <span className="min-w-0 truncate text-sm text-text-muted">
                    {t.note ?? ""}
                  </span>
                  <span
                    className="text-right text-sm font-semibold tnum tabular-nums whitespace-nowrap"
                    style={{ color }}
                  >
                    {sign}
                    {formatMoney(t.amount, currency)}
                  </span>
                  <RowMenuButton
                    isOpen={isOpen}
                    onToggle={(e) => {
                      e.stopPropagation();
                      setOpenMenu((id) => (id === t.id ? null : t.id));
                    }}
                    menuRef={isOpen ? menuRef : undefined}
                    onEdit={() => {
                      setOpenMenu(null);
                      onEdit(t);
                    }}
                    onDelete={() => {
                      setOpenMenu(null);
                      onDelete(t);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function RowMenuButton({
  isOpen,
  onToggle,
  menuRef,
  onEdit,
  onDelete,
  extraButtonClass,
}: {
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  menuRef: React.RefObject<HTMLDivElement | null> | undefined;
  onEdit: () => void;
  onDelete: () => void;
  extraButtonClass?: string;
}) {
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Действия"
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface",
          "md:opacity-0 md:group-hover:opacity-100 md:transition-opacity",
          isOpen && "md:opacity-100 bg-surface",
          extraButtonClass,
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-20 w-44 card shadow-lg border border-border py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={onEdit}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg text-left"
          >
            <Pencil className="w-3.5 h-3.5 text-text-muted" />
            Изменить
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg text-expense text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
