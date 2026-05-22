import type { TransactionType } from "@prisma/client";

/**
 * Тариф пользователя.
 * - TRIAL  — активен пробный период
 * - PAID   — оплачена подписка
 * - FREE   — пробный период истёк, оплаты нет (бесплатный тариф)
 *
 * ВАЖНО: модуль безопасен для клиента (без `"server-only"` и без `next/headers`).
 * Серверные helpers находятся в `lib/dal.ts` (`getCurrentAccess`,
 * `requirePaidFeature`).
 */
export type AccessTier = "TRIAL" | "PAID" | "FREE";

/** Платные фичи — недоступны на FREE тарифе. */
export type PaidFeature = "debts" | "assets" | "balance" | "plans";

/** Типы операций, которые недоступны в бесплатном тарифе. */
export const PAID_TX_TYPES = new Set<TransactionType>([
  "DEBT_TAKE",
  "DEBT_RETURN",
  "DEBT_GIVE",
  "DEBT_RECEIVE",
  "ASSET_BUY",
]);

export function isPaidTxType(type: TransactionType): boolean {
  return PAID_TX_TYPES.has(type);
}

/**
 * Описание подписки в виде, не зависящем от Prisma (структурный тип).
 * Совпадает с `SubscriptionView` из `lib/billing.ts`, но не импортируется
 * из server-only модулей — поэтому модуль остаётся клиент-безопасным.
 */
type SubscriptionViewLike = {
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  expired: boolean;
};

export function getAccessTier(view: SubscriptionViewLike): AccessTier {
  if (view.expired) return "FREE";
  if (view.status === "TRIALING") return "TRIAL";
  return "PAID";
}

export function hasPaidAccess(tier: AccessTier): boolean {
  return tier === "TRIAL" || tier === "PAID";
}
