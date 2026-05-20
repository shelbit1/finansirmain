"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="you@example.com"
        />
        {state?.errors?.email?.[0] && (
          <p className="text-expense text-xs mt-1">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
        {state?.errors?.password?.[0] && (
          <p className="text-expense text-xs mt-1">{state.errors.password[0]}</p>
        )}
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          name="rememberMe"
          defaultChecked
          className="w-4 h-4 accent-primary cursor-pointer shrink-0"
        />
        <span className="text-sm text-text-muted">Запомнить меня</span>
      </label>

      {state?.message && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
