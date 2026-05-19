"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Coins,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { AssetType } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn, formatDateShort, formatMoney, formatNumber, percentChange } from "@/lib/utils";
import { ASSET_TYPES, ASSET_TYPE_LIST } from "@/lib/assetTypes";
import { AssetForm, type AssetDto } from "./AssetForm";
import { AssetValueForm } from "./AssetValueForm";
import { AssetChart } from "./AssetChart";

export type AssetWithHistory = AssetDto & {
  valueHistory: { id: string; value: number; date: string; note: string | null }[];
};

export function AssetsManager({ assets }: { assets: AssetWithHistory[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | AssetType>("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AssetWithHistory | null>(null);
  const [updating, setUpdating] = useState<AssetWithHistory | null>(null);
  const [deleting, setDeleting] = useState<AssetWithHistory | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => (filter === "ALL" ? assets : assets.filter((a) => a.type === filter)),
    [assets, filter],
  );

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setUpdating(null);
    setDeleting(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await fetch(`/api/assets/${deleting.id}`, { method: "DELETE" });
      refresh();
    } finally {
      setDeletePending(false);
    }
  };

  const deleteHistory = async (assetId: string, vid: string) => {
    await fetch(`/api/assets/${assetId}/values/${vid}`, { method: "DELETE" });
    router.refresh();
  };

  if (assets.length === 0) {
    return (
      <>
        <EmptyState
          icon={Coins}
          title="Активов пока нет"
          description="Добавьте первый актив — недвижимость, авто, акции или крипту"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить актив
            </button>
          }
        />
        <Modal open={creating} onClose={() => setCreating(false)} title="Новый актив" maxWidth="max-w-lg">
          <AssetForm onSuccess={refresh} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <ScrollableTabs className="mb-4">
        <button
          onClick={() => setFilter("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
            filter === "ALL" ? "bg-surface shadow-sm" : "text-text-muted",
          )}
        >
          Все
        </button>
        {ASSET_TYPE_LIST.map(([key, info]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              filter === key ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {info.emoji} {info.label}
          </button>
        ))}
      </ScrollableTabs>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((a) => {
          const typeInfo = ASSET_TYPES[a.type];
          const change = a.currentValue - a.purchasePrice;
          const pct = percentChange(a.currentValue, a.purchasePrice);
          const positive = change >= 0;
          const ChangeIcon = positive ? TrendingUp : TrendingDown;
          const changeColor = positive ? "var(--color-income)" : "var(--color-expense)";
          const lastUpdate = a.valueHistory[a.valueHistory.length - 1]?.date;
          const isExpanded = expanded[a.id];

          return (
            <div key={a.id} className="card overflow-hidden min-w-0">
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-asset/14 flex items-center justify-center text-xl shrink-0">
                      {typeInfo.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{a.name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {typeInfo.label}
                        {a.quantity != null && ` · ${formatNumber(a.quantity)} ${a.unit ?? ""}`}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="font-display text-2xl font-bold tnum truncate">
                  {formatMoney(a.currentValue, a.currency)}
                </p>

                <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                  <p className="text-xs text-text-muted tnum truncate">
                    Куплено за {formatMoney(a.purchasePrice, a.currency)}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-medium tnum"
                    style={{ color: changeColor }}
                  >
                    <ChangeIcon className="w-3.5 h-3.5 shrink-0" />
                    {positive ? "+" : ""}
                    {formatMoney(Math.abs(change), a.currency)} ({positive ? "+" : "−"}
                    {Math.abs(pct).toFixed(1)}%)
                  </span>
                </div>

                {lastUpdate && (
                  <p className="text-xs text-text-muted mt-1">
                    Обновлено {formatDateShort(lastUpdate)}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    onClick={() => setUpdating(a)}
                    className="btn btn-primary h-9 px-3 text-sm"
                  >
                    <span className="hidden sm:inline">Обновить стоимость</span>
                    <span className="sm:hidden">Обновить</span>
                  </button>
                  <button
                    onClick={() => setExpanded((s) => ({ ...s, [a.id]: !s[a.id] }))}
                    className="btn btn-ghost h-9 px-3 text-sm"
                  >
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                    График
                  </button>
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() => setEditing(a)}
                      aria-label="Редактировать"
                      className="btn btn-ghost h-9 w-9 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(a)}
                      aria-label="Удалить"
                      className="btn btn-ghost h-9 w-9 p-0 hover:text-expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-bg/40 p-3">
                  <AssetChart
                    data={a.valueHistory.map((v) => ({ date: v.date, value: v.value }))}
                    purchasePrice={a.purchasePrice}
                    currency={a.currency}
                  />
                  {a.valueHistory.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {a.valueHistory.slice().reverse().map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 px-2 py-1.5 text-xs"
                        >
                          <span className="text-text-muted shrink-0 w-16">
                            {formatDateShort(v.date)}
                          </span>
                          <span className="font-medium tnum flex-1">
                            {formatMoney(v.value, a.currency)}
                          </span>
                          {v.note && (
                            <span className="text-text-muted truncate">{v.note}</span>
                          )}
                          {a.valueHistory.length > 1 && (
                            <button
                              onClick={() => deleteHistory(a.id, v.id)}
                              aria-label="Удалить запись"
                              className="p-1 text-text-muted hover:text-expense rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Новый актив"
        maxWidth="max-w-lg"
      >
        <AssetForm onSuccess={refresh} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование актива"
        maxWidth="max-w-lg"
      >
        {editing && <AssetForm asset={editing} onSuccess={refresh} />}
      </Modal>

      <Modal
        open={Boolean(updating)}
        onClose={() => setUpdating(null)}
        title={updating ? `Обновить стоимость: ${updating.name}` : "Обновить"}
      >
        {updating && (
          <AssetValueForm
            assetId={updating.id}
            currentValue={updating.currentValue}
            onSuccess={refresh}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить актив?"
      >
        <p className="text-text-muted text-sm mb-4">
          Актив «{deleting?.name}» и вся история стоимости будут удалены.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setDeleting(null)} className="btn btn-ghost flex-1">
            Отмена
          </button>
          <button onClick={handleDelete} disabled={deletePending} className="btn btn-danger flex-1">
            {deletePending ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function AddAssetButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Добавить актив</span>
        <span className="sm:hidden">Добавить</span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новый актив"
        maxWidth="max-w-lg"
      >
        <AssetForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
