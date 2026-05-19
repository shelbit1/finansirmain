"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import type { Account } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountForm } from "./AccountForm";
import { decimalToNumber, formatMoney } from "@/lib/utils";

type AccountDto = Pick<Account, "id" | "name" | "currency" | "icon" | "color"> & {
  balance: string | number;
};

export function AccountsManager({ accounts }: { accounts: AccountDto[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountDto | null>(null);
  const [deleting, setDeleting] = useState<AccountDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

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
      const res = await fetch(`/api/accounts/${deleting.id}`, { method: "DELETE" });
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

  if (accounts.length === 0) {
    return (
      <>
        <EmptyState
          icon={Wallet}
          title="Ещё нет счетов"
          description="Создайте первый счёт — карта, наличные или вклад. Балансы будут рассчитываться автоматически."
          action={
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Добавить счёт
            </button>
          }
        />
        <Modal open={creating} onClose={() => setCreating(false)} title="Новый счёт">
          <AccountForm onSuccess={refresh} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4 md:hidden">
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((a) => (
          <div key={a.id} className="card card-hover p-5 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `color-mix(in srgb, ${a.color ?? "#3D7EFF"} 14%, transparent)` }}
              >
                {a.icon ?? "💰"}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(a)}
                  aria-label="Редактировать"
                  className="p-1.5 text-text-muted hover:text-text rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleting(a)}
                  aria-label="Удалить"
                  className="p-1.5 text-text-muted hover:text-expense rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-text-muted truncate">{a.name}</p>
            <p className="font-display text-2xl font-bold tnum mt-0.5 truncate">
              {formatMoney(decimalToNumber(a.balance), a.currency)}
            </p>
          </div>
        ))}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый счёт">
        <AccountForm onSuccess={refresh} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Редактирование счёта"
      >
        {editing && <AccountForm account={editing} onSuccess={refresh} />}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        title="Удалить счёт?"
      >
        <p className="text-text-muted text-sm mb-4">
          Счёт «{deleting?.name}» будет удалён без возможности восстановления.
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
    </>
  );
}

export function AddAccountButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Добавить счёт</span>
        <span className="sm:hidden">Добавить</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новый счёт">
        <AccountForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
