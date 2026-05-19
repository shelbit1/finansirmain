"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarClock,
} from "lucide-react";
import type { PlanType } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { PlanForm, type PlanDto } from "./PlanForm";

type Filter = "ACTIVE" | "INCOME" | "EXPENSE" | "DONE";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ACTIVE", label: "Активные" },
  { id: "INCOME", label: "Доходы" },
  { id: "EXPENSE", label: "Расходы" },
  { id: "DONE", label: "Выполненные" },
];

const TYPE_META: Record<
  PlanType,
  { icon: typeof ArrowDown; color: string; sign: "+" | "−"; label: string }
> = {
  PLAN_INCOME: {
    icon: ArrowDown,
    color: "var(--color-income)",
    sign: "+",
    label: "Доход",
  },
  PLAN_EXPENSE: {
    icon: ArrowUp,
    color: "var(--color-expense)",
    sign: "−",
    label: "Расход",
  },
};

export function PlansManager({ plans }: { plans: PlanDto[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlanDto | null>(null);
  const [deleting, setDeleting] = useState<PlanDto | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "DONE") return plans.filter((p) => p.completed);
    if (filter === "INCOME") {
      return plans.filter((p) => !p.completed && p.type === "PLAN_INCOME");
    }
    if (filter === "EXPENSE") {
      return plans.filter((p) => !p.completed && p.type === "PLAN_EXPENSE");
    }
    return plans.filter((p) => !p.completed);
  }, [plans, filter]);

  const totals = useMemo(() => {
    const active = plans.filter((p) => !p.completed);
    return {
      income: active
        .filter((p) => p.type === "PLAN_INCOME")
        .reduce((s, p) => s + p.amount, 0),
      expense: active
        .filter((p) => p.type === "PLAN_EXPENSE")
        .reduce((s, p) => s + p.amount, 0),
    };
  }, [plans]);

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    router.refresh();
  };

  const toggle = async (plan: PlanDto) => {
    setTogglingId(plan.id);
    try {
      await fetch(`/api/plans/${plan.id}/toggle`, { method: "PATCH" });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await fetch(`/api/plans/${deleting.id}`, { method: "DELETE" });
      refresh();
    } finally {
      setDeletePending(false);
    }
  };

  if (plans.length === 0) {
    return (
      <>
        <EmptyState
          icon={CalendarCheck}
          title="Планов пока нет"
          description="Запишите будущий доход или расход — отмечайте галочкой по мере выполнения"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить план
            </button>
          }
        />
        <Modal open={creating} onClose={() => setCreating(false)} title="Новый план">
          <PlanForm onSuccess={refresh} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
        <SummaryCard
          label="Планируемые доходы"
          value={totals.income}
          color="var(--color-income)"
        />
        <SummaryCard
          label="Планируемые расходы"
          value={totals.expense}
          color="var(--color-expense)"
        />
      </div>

      <ScrollableTabs className="mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              filter === f.id ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </ScrollableTabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={filter === "DONE" ? CalendarCheck : CalendarClock}
          title={filter === "DONE" ? "Нет выполненных" : "Нет активных планов"}
          description={
            filter === "DONE"
              ? "Отмеченные галочкой планы попадут сюда"
              : "Добавьте новый план — он появится в списке"
          }
        />
      ) : (
        <div className="card divide-y divide-border">
          {filtered.map((p) => {
            const meta = TYPE_META[p.type];
            const Icon = meta.icon;
            const isToggling = togglingId === p.id;
            return (
              <div
                key={p.id}
                className="group flex items-center gap-3 p-3 sm:p-4 hover:bg-bg/60 first:rounded-t-xl last:rounded-b-xl"
              >
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  disabled={isToggling}
                  aria-label={p.completed ? "Снять отметку" : "Отметить выполненным"}
                  className="shrink-0 text-text-muted hover:text-primary disabled:opacity-50"
                >
                  {p.completed ? (
                    <CheckCircle2
                      className="w-6 h-6"
                      style={{ color: "var(--color-primary)" }}
                    />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-label="Редактировать план"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex"
                    style={{
                      background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "block font-medium truncate",
                        p.completed && "line-through text-text-muted",
                      )}
                    >
                      {p.title}
                    </span>
                    <span className="block text-xs text-text-muted truncate">
                      {meta.label}
                      {p.dueDate ? ` · до ${formatDate(p.dueDate)}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                  </span>

                  <span className="text-right shrink-0">
                    <span
                      className={cn(
                        "block font-semibold tnum text-sm sm:text-base",
                        p.completed && "line-through opacity-60",
                      )}
                      style={{ color: meta.color }}
                    >
                      {meta.sign}
                      {formatMoney(p.amount, p.currency)}
                    </span>
                  </span>
                </button>

                <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                  <button
                    onClick={() => setEditing(p)}
                    aria-label="Редактировать"
                    className="p-2 text-text-muted hover:text-text rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    aria-label="Удалить"
                    className="p-2 text-text-muted hover:text-expense rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый план">
        <PlanForm onSuccess={refresh} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование плана"
      >
        {editing && <PlanForm plan={editing} onSuccess={refresh} />}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить план?"
      >
        <p className="text-text-muted text-sm mb-4">
          План будет удалён без возможности восстановления.
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

export function AddPlanButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Добавить план</span>
        <span className="sm:hidden">Добавить</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новый план">
        <PlanForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-3 sm:p-4 min-w-0">
      <p className="text-xs sm:text-sm text-text-muted truncate">{label}</p>
      <p
        className="font-display text-lg sm:text-2xl font-bold tnum mt-0.5 truncate"
        style={{ color }}
      >
        {formatMoney(value, "RUB")}
      </p>
    </div>
  );
}
