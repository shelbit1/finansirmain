"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { destroySession } from "@/lib/session";
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
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Пользователь не найден" };

  const ok = await bcrypt.compare(parsed.data.current, user.password);
  if (!ok) return { error: "Неверный текущий пароль" };

  const hash = await bcrypt.hash(parsed.data.next, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
  return { ok: true };
}

export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
  await destroySession();
  redirect("/");
}
