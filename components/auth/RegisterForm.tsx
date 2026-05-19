"use client";

import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = null;

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Имя
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="input"
          placeholder="Как к вам обращаться?"
        />
        {state?.errors?.name?.[0] && (
          <p className="text-expense text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          placeholder="Минимум 8 символов"
        />
        {state?.errors?.password?.[0] && (
          <p className="text-expense text-xs mt-1">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Создаём…" : "Создать аккаунт"}
      </button>
    </form>
  );
}
