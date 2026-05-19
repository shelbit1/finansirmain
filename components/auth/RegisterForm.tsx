"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = null;

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const [consent, setConsent] = useState(false);

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

      <div className="space-y-2.5 pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="w-4 h-4 mt-0.5 accent-primary cursor-pointer shrink-0"
          />
          <span className="text-xs leading-snug text-text-muted">
            Я ознакомлен(а) с{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Политикой конфиденциальности
            </Link>{" "}
            и даю{" "}
            <Link
              href="/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              согласие на обработку персональных данных
            </Link>
          </span>
        </label>
        {state?.errors?.consent?.[0] && (
          <p className="text-expense text-xs">{state.errors.consent[0]}</p>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="marketingConsent"
            className="w-4 h-4 mt-0.5 accent-primary cursor-pointer shrink-0"
          />
          <span className="text-xs leading-snug text-text-muted">
            Я согласен(на) получать новости и предложения сервиса «Финансыр» на
            email.{" "}
            <Link
              href="/consent-marketing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Условия рассылки
            </Link>
          </span>
        </label>
      </div>

      {state?.message && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending || !consent}
      >
        {pending ? "Создаём…" : "Создать аккаунт"}
      </button>
    </form>
  );
}
