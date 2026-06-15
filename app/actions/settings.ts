"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordSchema } from "@/lib/validators";

export type SettingsState = { ok?: boolean; error?: string } | null;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(80),
});

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректное имя" };
  }
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

const changePasswordSchema = z.object({
  current: z.string().min(1, "Введите текущий пароль"),
  next: passwordSchema,
});

export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Пользователь не найден" };

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const supabase = await createClient();

  // Проверяем текущий пароль повторной аутентификацией.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (signInError) return { error: "Неверный текущий пароль" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) return { error: error.message };

  return { ok: true };
}

export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();

  // Удаляем профиль и все связанные данные (каскад по внешним ключам).
  await prisma.user.delete({ where: { id: userId } });

  // Удаляем пользователя из Supabase Auth (требуется секретный ключ).
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}
