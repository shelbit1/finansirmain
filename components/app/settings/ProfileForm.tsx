"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsState } from "@/app/actions/settings";

const initial: SettingsState = null;

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">E-mail</label>
        <input value={email} disabled className="input bg-bg text-text-muted" />
        <p className="text-xs text-text-muted mt-1">E-mail изменить нельзя</p>
      </div>

      <div>
        <label className="label">Имя</label>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          className="input"
        />
      </div>

      {state?.error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-income text-sm bg-income/8 border border-income/20 rounded-lg px-3 py-2">
          Изменения сохранены
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
