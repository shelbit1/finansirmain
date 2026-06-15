"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/onboarding";
import { loginSchema, registerSchema } from "@/lib/validators";

export type AuthFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent") ?? "",
    marketingConsent: formData.get("marketingConsent") ?? "",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, marketingConsent } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, marketing_consent: marketingConsent },
    },
  });

  if (error) {
    if (error.status === 422 || /already/i.test(error.message)) {
      return {
        errors: { email: ["Пользователь с таким e-mail уже зарегистрирован"] },
      };
    }
    return { message: error.message };
  }

  const userId = data.user?.id;

  // Если подтверждение email выключено — сессия создаётся сразу, можно
  // сразу создать профиль и засеять дефолты, затем перейти в приложение.
  if (userId && data.session) {
    await provisionUser({
      id: userId,
      email,
      name,
      marketingConsent,
      consentAcceptedAt: new Date(),
    });
    redirect("/dashboard");
  }

  // Подтверждение email включено: сессии нет, профиль создастся при первом входе.
  return {
    message:
      "Мы отправили письмо для подтверждения e-mail. Перейдите по ссылке из письма, чтобы войти.",
  };
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { message: "Неверный e-mail или пароль" };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
