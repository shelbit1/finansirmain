"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus, Trash2 } from "lucide-react";
import type { AssetType } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn, formatDateShort, formatMoney } from "@/lib/utils";
import {
  ASSET_CATEGORIES,
  assetCategory,
  type AssetCategory,
} from "@/lib/assetTypes";
import { AssetForm, type AssetDto } from "./AssetForm";
import { AssetValueForm } from "./AssetValueForm";
import { AssetChart } from "./AssetChart";
import { AssetsTable, type RowAction } from "./AssetsTable";

export type AssetWithHistory = AssetDto & {
  valueHistory: { id: string; value: number; date: string; note: string | null }[];
};

type Filter = "ALL" | AssetCategory;

export function AssetsManager({ assets }: { assets: AssetWithHistory[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AssetWithHistory | null>(null);
  const [updating, setUpdating] = useState<AssetWithHistory | null>(null);
  const [chartAsset, setChartAsset] = useState<AssetWithHistory | null>(null);
  const [deleting, setDeleting] = useState<AssetWithHistory | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? assets
        : assets.filter((a) => assetCategory(a.type) === filter),
    [assets, filter],
  );

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setUpdating(null);
    setChartAsset(null);
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

  const onRowAction = (asset: AssetWithHistory, action: RowAction) => {
    if (action === "edit") setEditing(asset);
    else if (action === "update") setUpdating(asset);
    else if (action === "chart") setChartAsset(asset);
    else if (action === "delete") setDeleting(asset);
  };

  if (assets.length === 0) {
    return (
      <>
        <EmptyState
          icon={Coins}
          title="Активов пока нет"
          description="Добавьте первый актив — недвижимость, транспорт или прочее"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить актив
            </button>
          }
        />
        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Новый актив"
          maxWidth="max-w-lg"
        >
          <AssetForm onSuccess={refresh} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <ScrollableTabs className="mb-4">
        <TabButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          Все
        </TabButton>
        {ASSET_CATEGORIES.map((c) => (
          <TabButton
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </TabButton>
        ))}
      </ScrollableTabs>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-text-muted text-sm">В этой категории активов нет</p>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Показать все
          </button>
        </div>
      ) : (
        <AssetsTable items={filtered} onAction={onRowAction} />
      )}

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
        open={Boolean(chartAsset)}
        onClose={() => setChartAsset(null)}
        title={chartAsset ? `График: ${chartAsset.name}` : "График стоимости"}
        maxWidth="max-w-xl"
      >
        {chartAsset && (
          <div className="space-y-3">
            <AssetChart
              data={chartAsset.valueHistory.map((v) => ({
                date: v.date,
                value: v.value,
              }))}
              purchasePrice={chartAsset.purchasePrice}
              currency={chartAsset.currency}
            />
            {chartAsset.valueHistory.length > 0 && (
              <div className="max-h-60 overflow-y-auto border-t border-border pt-2">
                {chartAsset.valueHistory
                  .slice()
                  .reverse()
                  .map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-2 py-1.5 text-xs"
                    >
                      <span className="text-text-muted shrink-0 w-16">
                        {formatDateShort(v.date)}
                      </span>
                      <span className="font-medium tnum flex-1">
                        {formatMoney(v.value, chartAsset.currency)}
                      </span>
                      {v.note && (
                        <span className="text-text-muted truncate">{v.note}</span>
                      )}
                      {chartAsset.valueHistory.length > 1 && (
                        <button
                          onClick={() => deleteHistory(chartAsset.id, v.id)}
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
          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="btn btn-danger flex-1"
          >
            {deletePending ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
        active ? "bg-surface shadow-sm" : "text-text-muted",
      )}
    >
      {children}
    </button>
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
