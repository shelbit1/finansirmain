import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { describeSubscription, ensureTrialSubscription } from "@/lib/billing";

export const getSession = cache(async () => {
  return readSession();
});

export const requireUserId = cache(async (): Promise<string> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session.userId;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Возвращает userId, если подписка пользователя активна (триал или оплачено).
 * Иначе редиректит на /billing.
 */
export const requireActiveSubscription = cache(async (): Promise<string> => {
  const userId = await requireUserId();
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    // На случай старых пользователей без подписки — создаём триал.
    sub = await ensureTrialSubscription(userId);
  }
  const view = describeSubscription(sub);
  if (view.expired) redirect("/billing");
  return userId;
});
