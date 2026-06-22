"use client";

import { useActionState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { createProjectAction, type ProjectFormState } from "@/app/actions/business";

export function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(
    createProjectAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === null && !pending) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, pending, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Новый проект">
      <form ref={formRef} action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="proj-name">
            Название <span className="text-expense">*</span>
          </label>
          <input
            id="proj-name"
            name="name"
            type="text"
            placeholder="Например: Кофейня на Арбате"
            autoFocus
            className="input w-full"
          />
          {state?.errors?.name && (
            <p className="text-xs text-expense mt-1">{state.errors.name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="proj-desc">
            Описание
          </label>
          <textarea
            id="proj-desc"
            name="description"
            rows={3}
            placeholder="Краткое описание проекта..."
            className="input w-full resize-none"
          />
          {state?.errors?.description && (
            <p className="text-xs text-expense mt-1">{state.errors.description[0]}</p>
          )}
        </div>

        {state?.message && (
          <p className="text-sm text-expense">{state.message}</p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
          >
            Отмена
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Создание…" : "Создать проект"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
