"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { deleteAccount } from "@/app/actions/settings";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-danger">
        Удалить аккаунт
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Удалить аккаунт?">
        <p className="text-text-muted text-sm mb-4">
          Все ваши данные (счета, операции, долги, активы) будут навсегда удалены. Восстановить
          их будет нельзя.
        </p>
        <label className="label">
          Для подтверждения введите слово <span className="font-mono font-semibold">УДАЛИТЬ</span>
        </label>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.toUpperCase())}
          className="input mb-4"
        />
        <form action={deleteAccount} className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-ghost flex-1"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={confirm !== "УДАЛИТЬ"}
            className="btn btn-danger flex-1"
          >
            Удалить навсегда
          </button>
        </form>
      </Modal>
    </>
  );
}
