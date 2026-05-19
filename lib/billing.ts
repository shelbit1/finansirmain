import "server-only";
import type { Payment, PaymentStatus, Subscription } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mapTbankStatus } from "@/lib/tbank";

export const PLAN_PRICE_RUB = 10;
export const PLAN_PRICE_KOPECKS = PLAN_PRICE_RUB * 100;
export const PLAN_PERIOD_MONTHS = 1;
export const TRIAL_DAYS = 7;

export type SubscriptionView = {
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  /** Истекла подписка (нет ни активного триала, ни оплаченного периода). */
  expired: boolean;
  /** Сколько дней осталось до конца текущего доступа (null если нет). */
  daysLeft: number | null;
};

export function describeSubscription(
  sub: Subscription | null,
  now: Date = new Date(),
): SubscriptionView {
  if (!sub) {
    return {
      status: "PAST_DUE",
      trialEndsAt: null,
      currentPeriodEnd: null,
      expired: true,
      daysLeft: null,
    };
  }

  const trialActive = sub.trialEndsAt && sub.trialEndsAt > now;
  const paidActive = sub.currentPeriodEnd && sub.currentPeriodEnd > now;

  const accessEnd =
    paidActive && sub.currentPeriodEnd
      ? sub.currentPeriodEnd
      : trialActive && sub.trialEndsAt
        ? sub.trialEndsAt
        : null;

  const daysLeft = accessEnd
    ? Math.max(0, Math.ceil((accessEnd.getTime() - now.getTime()) / 86_400_000))
    : null;

  return {
    status: sub.status,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    expired: !trialActive && !paidActive,
    daysLeft,
  };
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export async function getSubscriptionView(
  userId: string,
): Promise<SubscriptionView> {
  const sub = await getUserSubscription(userId);
  return describeSubscription(sub);
}

/** Создать триал-подписку при регистрации (idempotent). */
export async function ensureTrialSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  return prisma.subscription.create({
    data: {
      userId,
      status: "TRIALING",
      trialEndsAt,
    },
  });
}

/**
 * Продлить подписку на N месяцев после успешного платежа.
 * Если текущий период ещё не закончился — добавляем сверху, иначе считаем от сейчас.
 */
export async function extendSubscriptionAfterPayment(
  userId: string,
  months: number,
) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const now = new Date();
  const start =
    sub?.currentPeriodEnd && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : now;
  const newEnd = addMonths(start, months);

  if (sub) {
    return prisma.subscription.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: newEnd,
        canceledAt: null,
      },
    });
  }
  return prisma.subscription.create({
    data: {
      userId,
      status: "ACTIVE",
      currentPeriodEnd: newEnd,
    },
  });
}

/**
 * Применить ответ T-Bank (webhook или GetState) к нашей записи Payment.
 * Возвращает обновлённую запись и флаг "впервые CONFIRMED" — чтобы вызывать
 * продление подписки только один раз.
 */
export async function applyTbankStatusToPayment(opts: {
  payment: Payment;
  tbankStatus: string | null | undefined;
  tbankPaymentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<{ payment: Payment; justConfirmed: boolean }> {
  const mapped: PaymentStatus = mapTbankStatus(opts.tbankStatus);
  const wasConfirmed = opts.payment.status === "CONFIRMED";

  const updated = await prisma.payment.update({
    where: { id: opts.payment.id },
    data: {
      status: mapped,
      tbankStatus: opts.tbankStatus ?? opts.payment.tbankStatus,
      tbankPaymentId: opts.tbankPaymentId ?? opts.payment.tbankPaymentId,
      paidAt:
        mapped === "CONFIRMED" && !opts.payment.paidAt
          ? new Date()
          : opts.payment.paidAt,
      errorCode: opts.errorCode ?? opts.payment.errorCode,
      errorMessage:
        opts.errorCode && opts.errorCode !== "0"
          ? (opts.errorMessage ?? opts.payment.errorMessage)
          : opts.payment.errorMessage,
    },
  });

  const justConfirmed = mapped === "CONFIRMED" && !wasConfirmed;
  if (justConfirmed) {
    await extendSubscriptionAfterPayment(updated.userId, updated.periodMonths);
  }

  return { payment: updated, justConfirmed };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Если в новом месяце меньше дней — setDate скорректирует, но это ОК.
  if (d.getDate() < day) {
    // setMonth перепрыгнул через короткий месяц — берём последний день месяца
    d.setDate(0);
  }
  return d;
}
