import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { provisionUser } from "@/lib/onboarding";
import {
  describeSubscription,
  ensureTrialSubscription,
  type SubscriptionView,
} from "@/lib/billing";
import {
  getAccessTier,
  hasPaidAccess,
  type AccessTier,
  type PaidFeature,
} from "@/lib/access";

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

  let user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  // Профиль создаётся в Supabase Auth; если строки в public."User" ещё нет
  // (например, после подтверждения email), создаём её и засеваем дефолты.
  if (!user) {
    await provisionUser({
      id: session.userId,
      email: session.email ?? "",
    });
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  return user;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export type CurrentAccess = {
  userId: string;
  tier: AccessTier;
  view: SubscriptionView;
};

/**
 * Возвращает доступ для текущего пользователя. Если пользователь не авторизован —
 * редиректит на /login. НЕ редиректит при истечении подписки —
 * это делает `requirePaidFeature`.
 */
export const getCurrentAccess = cache(async (): Promise<CurrentAccess> => {
  const userId = await requireUserId();
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) sub = await ensureTrialSubscription(userId);
  const view = describeSubscription(sub);
  return { userId, tier: getAccessTier(view), view };
});

/**
 * Возвращает userId, если у пользователя есть платный доступ
 * (триал или оплачено). Иначе редиректит free-пользователя на /billing.
 *
 * Используется на страницах платных фич: /debts, /assets, /balance, /plans.
 * Для страниц, доступных и в бесплатном тарифе, используйте `getCurrentAccess`.
 */
export const requireActiveSubscription = cache(async (): Promise<string> => {
  const access = await getCurrentAccess();
  if (!hasPaidAccess(access.tier)) redirect("/billing");
  return access.userId;
});

/**
 * Гард для страниц с платной фичей. Редиректит free-пользователя на /billing.
 * Возвращает userId, если доступ есть.
 */
export async function requirePaidFeature(_feature: PaidFeature): Promise<string> {
  return requireActiveSubscription();
}
