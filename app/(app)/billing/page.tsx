import { CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { requireUserId } from "@/lib/dal";
import { prisma } from "@/lib/db";
import {
  PLAN_PERIOD_MONTHS,
  PLAN_PRICE_RUB,
  TRIAL_DAYS,
  describeSubscription,
} from "@/lib/billing";
import {
  decimalToNumber,
  formatDate,
  formatMoney,
} from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckoutButton } from "@/components/app/billing/CheckoutButton";
import { SyncPaymentButton } from "@/components/app/billing/SyncPaymentButton";

export const metadata = { title: "Подписка — Финансыр" };

const STATUS_BADGE: Record<
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED",
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  TRIALING: {
    label: "Пробный период",
    className: "bg-debt-get/10 text-debt-get",
    Icon: Clock,
  },
  ACTIVE: {
    label: "Активна",
    className: "bg-income/10 text-income",
    Icon: CheckCircle2,
  },
  PAST_DUE: {
    label: "Истекла",
    className: "bg-expense/10 text-expense",
    Icon: AlertTriangle,
  },
  CANCELED: {
    label: "Отменена",
    className: "bg-text-muted/10 text-text-muted",
    Icon: AlertTriangle,
  },
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; className: string }> =
  {
    NEW: { label: "Создан", className: "text-text-muted" },
    FORM_SHOWED: { label: "Открыта форма", className: "text-text-muted" },
    AUTHORIZED: { label: "Авторизован", className: "text-debt-get" },
    CONFIRMED: { label: "Оплачен", className: "text-income" },
    REJECTED: { label: "Отклонён", className: "text-expense" },
    REFUNDED: { label: "Возврат", className: "text-debt-owe" },
    CANCELED: { label: "Отменён", className: "text-text-muted" },
  };

export default async function BillingPage() {
  const userId = await requireUserId();

  const [subscription, payments] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const view = describeSubscription(subscription);
  const badge = STATUS_BADGE[view.status];
  const Icon = badge.Icon;

  const accessEnd =
    view.status === "ACTIVE"
      ? view.currentPeriodEnd
      : view.status === "TRIALING"
        ? view.trialEndsAt
        : null;

  return (
    <div>
      <PageHeader
        title="Подписка"
        subtitle="Управление тарифом и история платежей"
      />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {badge.label}
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold">
            Тариф «Финансыр»
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {formatMoney(PLAN_PRICE_RUB)} / {PLAN_PERIOD_MONTHS} мес.
          </p>

          <ul className="text-sm space-y-2 mt-4">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-income shrink-0 mt-0.5" />
              Долги: «я должен» и «должны мне»
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-income shrink-0 mt-0.5" />
              Активы и отчёт «Баланс»
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-income shrink-0 mt-0.5" />
              Планы и ежедневная памятка
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-income shrink-0 mt-0.5" />
              Бесплатный пробный период {TRIAL_DAYS} дней
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-debt-get shrink-0 mt-0.5" />
              Возврат в течение 14 дней
            </li>
          </ul>

          <div className="mt-4 rounded-lg bg-bg border border-border p-3 text-xs text-text-muted">
            После окончания подписки остаётся бесплатный тариф: операции «Доходы»,
            «Расходы», «Перемещения» и отчёт «Доходы − Расходы» — без ограничений
            по времени.
          </div>

          <div className="border-t border-border mt-5 pt-5">
            {accessEnd ? (
              <p className="text-sm">
                {view.status === "TRIALING"
                  ? "Пробный период до "
                  : "Подписка действует до "}
                <strong>{formatDate(accessEnd)}</strong>
                {view.daysLeft !== null && (
                  <span className="text-text-muted">
                    {" "}
                    · осталось {view.daysLeft} дн.
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-expense">
                Доступ к сервису заблокирован.
              </p>
            )}

            <div className="mt-4">
              <CheckoutButton
                label={
                  view.status === "ACTIVE"
                    ? `Продлить на ${PLAN_PERIOD_MONTHS} мес. — ${formatMoney(PLAN_PRICE_RUB)}`
                    : `Оплатить ${formatMoney(PLAN_PRICE_RUB)}`
                }
              />
            </div>

            <p className="text-xs text-text-muted mt-3">
              Оплата проводится через АО «Т-Банк». Реквизиты карты не
              сохраняются на наших серверах.
            </p>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            История платежей
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-text-muted">
              Платежей пока нет. После первой оплаты история появится здесь.
            </p>
          ) : (
            <ul className="divide-y divide-border -my-2">
              {payments.map((p) => {
                const meta = PAYMENT_STATUS_LABEL[p.status] ?? {
                  label: p.status,
                  className: "text-text-muted",
                };
                const canSync =
                  Boolean(p.tbankPaymentId) &&
                  (p.status === "NEW" ||
                    p.status === "FORM_SHOWED" ||
                    p.status === "AUTHORIZED");
                return (
                  <li
                    key={p.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.description ?? "Подписка"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(p.paidAt ?? p.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(decimalToNumber(p.amount), p.currency)}
                      </p>
                      <p className={`text-xs ${meta.className}`}>
                        {meta.label}
                      </p>
                      {canSync && <SyncPaymentButton orderId={p.orderId} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
