"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  HandCoins,
  ChevronDown,
  Coins,
  AlertCircle,
} from "lucide-react";
import type { DebtDirection, DebtStatus } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
import {
  cn,
  formatDate,
  formatDateShort,
  formatMoney,
  initials,
} from "@/lib/utils";
import { DebtForm, type DebtDto } from "./DebtForm";
import { DebtPaymentForm } from "./DebtPaymentForm";

export type DebtWithPayments = DebtDto & {
  status: DebtStatus;
  paidAmount: number;
  payments: { id: string; amount: number; date: string; note: string | null }[];
};

type Filter = "ALL" | DebtDirection | "CLOSED";

const STATUS_LABEL: Record<DebtStatus, string> = {
  ACTIVE: "Активный",
  PARTIALLY_PAID: "Частично выплачен",
  CLOSED: "Закрыт",
};

export function DebtsManager({ debts }: { debts: DebtWithPayments[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DebtWithPayments | null>(null);
  const [paying, setPaying] = useState<DebtWithPayments | null>(null);
  const [deleting, setDeleting] = useState<DebtWithPayments | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (filter === "ALL") return debts.filter((d) => d.status !== "CLOSED");
    if (filter === "CLOSED") return debts.filter((d) => d.status === "CLOSED");
    return debts.filter((d) => d.direction === filter && d.status !== "CLOSED");
  }, [debts, filter]);

  const refresh = () => {
    setCreating(false);
    setEditing(null);
    setPaying(null);
    setDeleting(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await fetch(`/api/debts/${deleting.id}`, { method: "DELETE" });
      refresh();
    } finally {
      setDeletePending(false);
    }
  };

  const deletePayment = async (debtId: string, pid: string) => {
    await fetch(`/api/debts/${debtId}/payments/${pid}`, { method: "DELETE" });
    router.refresh();
  };

  if (debts.length === 0) {
    return (
      <>
        <EmptyState
          icon={HandCoins}
          title="Долгов пока нет"
          description="Добавьте долг — кому вы должны или кто должен вам"
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить долг
            </button>
          }
        />
        <Modal open={creating} onClose={() => setCreating(false)} title="Новый долг">
          <DebtForm onSuccess={refresh} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <ScrollableTabs className="mb-4">
        {(["ALL", "I_OWE", "OWED_TO_ME", "CLOSED"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
              filter === f ? "bg-surface shadow-sm" : "text-text-muted",
            )}
          >
            {f === "ALL"
              ? "Все"
              : f === "I_OWE"
              ? "Я должен"
              : f === "OWED_TO_ME"
              ? "Мне должны"
              : "Закрытые"}
          </button>
        ))}
      </ScrollableTabs>

      {filtered.length === 0 ? (
        <EmptyState icon={Coins} title="Здесь пусто" />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const color = d.direction === "I_OWE" ? "var(--color-debt-owe)" : "var(--color-debt-get)";
            const remaining = Math.max(0, d.amount - d.paidAmount);
            const progress = d.amount > 0 ? Math.min(100, (d.paidAmount / d.amount) * 100) : 0;
            const overdue =
              d.status !== "CLOSED" && d.dueDate && new Date(d.dueDate) < new Date();
            const isExpanded = expanded[d.id];

            return (
              <div key={d.id} className="card overflow-hidden min-w-0">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${color} 18%, transparent)`,
                        color,
                      }}
                    >
                      {initials(d.personName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{d.personName}</p>
                          <p className="text-xs text-text-muted truncate">
                            <span style={{ color }}>
                              {d.direction === "I_OWE" ? "Я должен" : "Мне должны"}
                            </span>
                            {" · "}
                            {STATUS_LABEL[d.status]}
                          </p>
                        </div>
                        <div className="text-right shrink-0 min-w-0">
                          <p
                            className="font-display font-bold text-base sm:text-lg tnum truncate"
                            style={{ color }}
                          >
                            {formatMoney(remaining, d.currency)}
                          </p>
                          <p className="text-xs text-text-muted tnum truncate">
                            из {formatMoney(d.amount, d.currency)}
                          </p>
                        </div>
                      </div>

                      {d.paidAmount > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${progress}%`, background: color }}
                            />
                          </div>
                          <p className="text-xs text-text-muted mt-1 tnum">
                            Выплачено {formatMoney(d.paidAmount, d.currency)} ({progress.toFixed(0)}%)
                          </p>
                        </div>
                      )}

                      {(d.dueDate || d.description) && (
                        <div className="mt-2 text-xs text-text-muted flex flex-wrap gap-x-3 gap-y-1">
                          {d.dueDate && (
                            <span className={cn(overdue && "text-expense font-medium")}>
                              {overdue && <AlertCircle className="w-3 h-3 inline mr-0.5" />}
                              {overdue ? "Просрочен" : "Срок"}: {formatDate(d.dueDate)}
                            </span>
                          )}
                          {d.description && <span className="truncate">· {d.description}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {d.status !== "CLOSED" && (
                      <button
                        onClick={() => setPaying(d)}
                        className="btn btn-primary h-9 px-3 text-sm"
                      >
                        <span className="hidden sm:inline">Отметить платёж</span>
                        <span className="sm:hidden">+ Платёж</span>
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(d)}
                      aria-label="Редактировать"
                      className="btn btn-ghost h-9 px-3 text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Редактировать</span>
                    </button>
                    <button
                      onClick={() => setDeleting(d)}
                      aria-label="Удалить"
                      className="btn btn-ghost h-9 px-3 text-sm hover:text-expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Удалить</span>
                    </button>
                    {d.payments.length > 0 && (
                      <button
                        onClick={() => setExpanded((s) => ({ ...s, [d.id]: !s[d.id] }))}
                        className="btn btn-ghost h-9 px-3 text-sm ml-auto"
                      >
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                        <span className="tnum">{d.payments.length}</span>
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && d.payments.length > 0 && (
                  <div className="border-t border-border bg-bg/40">
                    {d.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium tnum">{formatMoney(p.amount, d.currency)}</p>
                          {p.note && <p className="text-xs text-text-muted truncate">{p.note}</p>}
                        </div>
                        <span className="text-xs text-text-muted">{formatDateShort(p.date)}</span>
                        <button
                          onClick={() => deletePayment(d.id, p.id)}
                          aria-label="Удалить платёж"
                          className="p-1.5 text-text-muted hover:text-expense rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый долг">
        <DebtForm onSuccess={refresh} />
      </Modal>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Редактирование долга">
        {editing && <DebtForm debt={editing} onSuccess={refresh} />}
      </Modal>
      <Modal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title={paying ? `Платёж по долгу: ${paying.personName}` : "Платёж"}
      >
        {paying && (
          <DebtPaymentForm
            debtId={paying.id}
            remaining={Math.max(0, paying.amount - paying.paidAmount)}
            onSuccess={refresh}
          />
        )}
      </Modal>
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Удалить долг?">
        <p className="text-text-muted text-sm mb-4">
          Долг и все платежи по нему будут удалены без возможности восстановления.
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

export function AddDebtButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Добавить долг</span>
        <span className="sm:hidden">Добавить</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новый долг">
        <DebtForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
