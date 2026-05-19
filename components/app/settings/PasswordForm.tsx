"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePassword, type SettingsState } from "@/app/actions/settings";

const initial: SettingsState = null;

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label className="label">Текущий пароль</label>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>
      <div>
        <label className="label">Новый пароль</label>
        <input
          name="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
          Пароль обновлён
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Меняем…" : "Сменить пароль"}
      </button>
    </form>
  );
}
