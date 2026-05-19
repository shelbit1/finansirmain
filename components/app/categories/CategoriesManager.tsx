"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn } from "@/lib/utils";
import { CategoryForm, type CategoryDto } from "./CategoryForm";

type Kind = "income" | "expense";

export function CategoriesManager({
  income,
  expense,
}: {
  income: CategoryDto[];
  expense: CategoryDto[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind>("expense");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const list = tab === "income" ? income : expense;

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    setDeleteError(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/categories/${tab}/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Не удалось удалить");
      }
      refresh();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollableTabs className="flex-1 min-w-0">
          <button
            onClick={() => setTab("expense")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              tab === "expense" ? "bg-surface shadow-sm text-expense" : "text-text-muted",
            )}
          >
            Расходы
          </button>
          <button
            onClick={() => setTab("income")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              tab === "income" ? "bg-surface shadow-sm text-income" : "text-text-muted",
            )}
          >
            Доходы
          </button>
        </ScrollableTabs>
        <button onClick={() => setCreating(true)} className="btn btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить категорию</span>
          <span className="sm:hidden">Добавить</span>
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Категорий пока нет"
          description="Добавьте первую категорию, чтобы группировать операции"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Создать
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="card card-hover p-3 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `color-mix(in srgb, ${c.color ?? "#999"} 14%, transparent)` }}
              >
                {c.icon ?? "•"}
              </div>
              <p className="font-medium flex-1 truncate">{c.name}</p>
              <div className="flex gap-0.5">
                <button
                  onClick={() => setEditing(c)}
                  aria-label="Редактировать"
                  className="p-1.5 text-text-muted hover:text-text rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  aria-label="Удалить"
                  className="p-1.5 text-text-muted hover:text-expense rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={tab === "income" ? "Новая статья дохода" : "Новая статья расхода"}
      >
        <CategoryForm kind={tab} onSuccess={refresh} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование категории"
      >
        {editing && <CategoryForm kind={tab} category={editing} onSuccess={refresh} />}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        title="Удалить категорию?"
      >
        <p className="text-text-muted text-sm mb-4">
          Категория «{deleting?.name}» будет удалена без возможности восстановления.
        </p>
        {deleteError && (
          <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2 mb-3">
            {deleteError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDeleting(null);
              setDeleteError(null);
            }}
            className="btn btn-ghost flex-1"
          >
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
    </div>
  );
}
