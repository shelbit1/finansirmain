"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn } from "@/lib/utils";
import { CategoryForm, type CategoryDto } from "./CategoryForm";
import {
  CategoryRow,
  type DragHandlers,
  type DragState,
  type RowAction,
} from "./CategoryRow";

type Kind = "income" | "expense";

type Tree = {
  roots: CategoryDto[];
  childrenByParent: Map<string, CategoryDto[]>;
};

function buildTree(list: CategoryDto[]): Tree {
  const roots: CategoryDto[] = [];
  const childrenByParent = new Map<string, CategoryDto[]>();
  for (const c of list) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }
  return { roots, childrenByParent };
}

export function CategoriesManager({
  income,
  expense,
}: {
  income: CategoryDto[];
  expense: CategoryDto[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Kind>("expense");
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Локальные копии списков, чтобы поддерживать оптимистичное переупорядочивание
  const [incomeList, setIncomeList] = useState<CategoryDto[]>(income);
  const [expenseList, setExpenseList] = useState<CategoryDto[]>(expense);
  useEffect(() => setIncomeList(income), [income]);
  useEffect(() => setExpenseList(expense), [expense]);

  const list = tab === "income" ? incomeList : expenseList;
  const setList = tab === "income" ? setIncomeList : setExpenseList;
  const tree = useMemo(() => buildTree(list), [list]);

  // Корневые категории — потенциальные родители в форме
  const parentOptions = useMemo(
    () => tree.roots.map((c) => ({ id: c.id, name: c.name })),
    [tree],
  );

  // ----- Drag and drop -----
  const [dragState, setDragState] = useState<DragState>({
    dragId: null,
    overId: null,
    overPos: null,
  });
  const dragSourceParentRef = useRef<string | null>(null);

  const drag: DragHandlers = {
    onDragStart: (id, parentId) => {
      dragSourceParentRef.current = parentId;
      setDragState({ dragId: id, overId: null, overPos: null });
    },
    onDragOver: (e: DragEvent<HTMLDivElement>, id, parentId) => {
      // Запрещаем перетаскивание между разными уровнями
      if (parentId !== dragSourceParentRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const pos: "before" | "after" =
        e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDragState((s) =>
        s.overId === id && s.overPos === pos ? s : { ...s, overId: id, overPos: pos },
      );
    },
    onDrop: (id, parentId) => {
      const { dragId, overPos } = dragState;
      const sourceParent = dragSourceParentRef.current;
      setDragState({ dragId: null, overId: null, overPos: null });
      if (!dragId || dragId === id) return;
      if (parentId !== sourceParent) return;
      void reorder(dragId, id, overPos ?? "after", parentId);
    },
    onDragEnd: () => {
      setDragState({ dragId: null, overId: null, overPos: null });
    },
  };

  const reorder = async (
    dragId: string,
    targetId: string,
    pos: "before" | "after",
    parentId: string | null,
  ) => {
    // Берём всех соседей текущего уровня
    const siblings = list.filter((c) => (c.parentId ?? null) === (parentId ?? null));
    const dragged = siblings.find((c) => c.id === dragId);
    if (!dragged) return;
    const without = siblings.filter((c) => c.id !== dragId);
    const targetIdx = without.findIndex((c) => c.id === targetId);
    if (targetIdx < 0) return;
    const insertAt = pos === "before" ? targetIdx : targetIdx + 1;
    const reordered = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)];

    // Собираем новую общую плоскую коллекцию: соседи переупорядочены, остальные на месте
    const reorderedIds = new Set(reordered.map((c) => c.id));
    const next: CategoryDto[] = [];
    let consumed = false;
    for (const c of list) {
      if (reorderedIds.has(c.id)) {
        if (!consumed) {
          next.push(...reordered);
          consumed = true;
        }
      } else {
        next.push(c);
      }
    }
    setList(next);

    try {
      const res = await fetch(`/api/categories/${tab}/reorder`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parentId: parentId ?? null,
          ids: reordered.map((c) => c.id),
        }),
      });
      if (!res.ok) throw new Error("reorder failed");
    } catch {
      // Откат к серверной версии
      router.refresh();
    }
  };

  // ----- Прочие действия -----
  const refresh = () => {
    setCreating(null);
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
      const res = await fetch(`/api/categories/${tab}/${deleting.id}`, {
        method: "DELETE",
      });
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

  const onRowAction = (c: CategoryDto, action: RowAction) => {
    if (action === "edit") setEditing(c);
    else if (action === "delete") setDeleting(c);
    else if (action === "addChild") setCreating({ parentId: c.id });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollableTabs className="flex-1 min-w-0">
          <TabButton
            active={tab === "expense"}
            tone="expense"
            onClick={() => setTab("expense")}
          >
            Расходы
          </TabButton>
          <TabButton
            active={tab === "income"}
            tone="income"
            onClick={() => setTab("income")}
          >
            Доходы
          </TabButton>
        </ScrollableTabs>
        <button
          onClick={() => setCreating({ parentId: null })}
          className="btn btn-primary shrink-0"
        >
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
            <button
              onClick={() => setCreating({ parentId: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> Создать
            </button>
          }
        />
      ) : (
        <div className="space-y-1.5 max-w-[50ch]">
          {tree.roots.map((root) => {
            const children = tree.childrenByParent.get(root.id) ?? [];
            const hasChildren = children.length > 0;
            const isExpanded = expanded[root.id] ?? true;
            return (
              <Fragment key={root.id}>
                <CategoryRow
                  category={root}
                  hasChildren={hasChildren}
                  expanded={isExpanded}
                  onToggle={() =>
                    setExpanded((s) => ({ ...s, [root.id]: !isExpanded }))
                  }
                  onAction={(a) => onRowAction(root, a)}
                  drag={drag}
                  dragState={dragState}
                  parentScope={null}
                />
                {hasChildren && isExpanded && (
                  <div className="ml-6 space-y-1.5 border-l border-border pl-3">
                    {children.map((c) => (
                      <CategoryRow
                        key={c.id}
                        category={c}
                        isChild
                        onAction={(a) => onRowAction(c, a)}
                        drag={drag}
                        dragState={dragState}
                        parentScope={root.id}
                      />
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      <Modal
        open={creating !== null}
        onClose={() => setCreating(null)}
        title={
          creating?.parentId
            ? "Новая подкатегория"
            : tab === "income"
              ? "Новая статья дохода"
              : "Новая статья расхода"
        }
      >
        <CategoryForm
          kind={tab}
          parents={parentOptions}
          defaultParentId={creating?.parentId ?? null}
          onSuccess={refresh}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование категории"
      >
        {editing && (
          <CategoryForm
            kind={tab}
            category={editing}
            parents={parentOptions}
            onSuccess={refresh}
          />
        )}
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
          Категория «{deleting?.name}» будет удалена без возможности
          восстановления. Подкатегории, если есть, останутся как корневые.
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

function TabButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "expense" | "income";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
        active
          ? cn(
              "bg-surface shadow-sm",
              tone === "expense" ? "text-expense" : "text-income",
            )
          : "text-text-muted",
      )}
    >
      {children}
    </button>
  );
}
