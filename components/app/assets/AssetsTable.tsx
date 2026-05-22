"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LineChart as LineChartIcon,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn, formatDateShort, formatMoney, percentChange } from "@/lib/utils";
import { assetTypeLabel } from "@/lib/assetTypes";
import type { AssetWithHistory } from "./AssetsManager";

export type RowAction = "update" | "chart" | "edit" | "delete";

export function AssetsTable({
  items,
  onAction,
}: {
  items: AssetWithHistory[];
  onAction: (asset: AssetWithHistory, action: RowAction) => void;
}) {
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
      <div className="hidden md:grid grid-cols-[minmax(150px,1.4fr)_120px_minmax(150px,1fr)_minmax(170px,1.1fr)_minmax(150px,1fr)_90px_40px] gap-x-4 px-4 py-2.5 border-b border-border text-xs font-medium text-text-muted uppercase tracking-wide">
        <span>Название</span>
        <span>Тип</span>
        <span className="text-right">Куплено за</span>
        <span className="text-right">Текущая стоимость</span>
        <span className="text-right">Прирост</span>
        <span>Обновлено</span>
        <span></span>
      </div>

      {items.map((a) => {
        const change = a.currentValue - a.purchasePrice;
        const pct = percentChange(a.currentValue, a.purchasePrice);
        const positive = change >= 0;
        const changeColor = positive
          ? "var(--color-income)"
          : "var(--color-expense)";
        const ChangeIcon = positive ? TrendingUp : TrendingDown;
        const lastUpdate = a.valueHistory[a.valueHistory.length - 1]?.date;

        return (
          <div
            key={a.id}
            className="group grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_40px] md:grid-cols-[minmax(150px,1.4fr)_120px_minmax(150px,1fr)_minmax(170px,1.1fr)_minmax(150px,1fr)_90px_40px] items-center gap-x-4 gap-y-0 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg/50 cursor-pointer"
            onClick={() => onAction(a, "edit")}
          >
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{a.name}</p>
              <p className="md:hidden text-xs text-text-muted truncate">
                {assetTypeLabel(a.type)}
                {" · "}
                {formatMoney(a.currentValue, a.currency)}
              </p>
            </div>

            <span className="hidden md:inline text-sm text-text-muted truncate">
              {assetTypeLabel(a.type)}
            </span>

            <span className="hidden md:block text-right text-sm tnum text-text-muted whitespace-nowrap">
              {formatMoney(a.purchasePrice, a.currency)}
            </span>

            <span className="text-right text-sm font-semibold tnum whitespace-nowrap">
              <span className="md:hidden text-xs text-text-muted block">
                {positive ? "+" : "−"}
                {formatMoney(Math.abs(change), a.currency)}
              </span>
              <span className="hidden md:inline">
                {formatMoney(a.currentValue, a.currency)}
              </span>
            </span>

            <div
              className="hidden md:block text-right tnum whitespace-nowrap"
              style={{ color: changeColor }}
            >
              <div className="text-sm font-medium flex items-center justify-end gap-1">
                <ChangeIcon className="w-3.5 h-3.5 shrink-0" />
                {positive ? "+" : "−"}
                {formatMoney(Math.abs(change), a.currency)}
              </div>
              <div className="text-xs">
                {positive ? "+" : "−"}
                {Math.abs(pct).toFixed(1)}%
              </div>
            </div>

            <span className="hidden md:inline text-xs text-text-muted">
              {lastUpdate ? formatDateShort(lastUpdate) : "—"}
            </span>

            <div
              className="relative"
              ref={openMenu === a.id ? menuRef : undefined}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu((id) => (id === a.id ? null : a.id));
                }}
                aria-label="Действия"
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface",
                  "md:opacity-0 md:group-hover:opacity-100 md:transition-opacity",
                  openMenu === a.id && "md:opacity-100 bg-surface",
                )}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {openMenu === a.id && (
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 z-20 w-52 card shadow-lg border border-border py-1"
                >
                  <MenuItem
                    icon={<ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                    label="Обновить стоимость"
                    onClick={() => {
                      setOpenMenu(null);
                      onAction(a, "update");
                    }}
                  />
                  <MenuItem
                    icon={<LineChartIcon className="w-3.5 h-3.5 text-text-muted" />}
                    label="График стоимости"
                    onClick={() => {
                      setOpenMenu(null);
                      onAction(a, "chart");
                    }}
                  />
                  <MenuItem
                    icon={<Pencil className="w-3.5 h-3.5 text-text-muted" />}
                    label="Изменить"
                    onClick={() => {
                      setOpenMenu(null);
                      onAction(a, "edit");
                    }}
                  />
                  <MenuItem
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Удалить"
                    danger
                    onClick={() => {
                      setOpenMenu(null);
                      onAction(a, "delete");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg text-left",
        danger && "text-expense",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
