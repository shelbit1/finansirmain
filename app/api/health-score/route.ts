import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized } from "@/lib/api";
import { decimalToNumber } from "@/lib/utils";

export type HealthZone = "excellent" | "good" | "coping" | "vulnerable";

export type HealthScoreComponent = {
  score: number;
  label: string;
  detail: string;
  weight: number;
  noData?: boolean;
};

export type HealthScoreResponse = {
  score: number;
  zone: HealthZone;
  components: {
    incomeExpense: HealthScoreComponent;
    cushion: HealthScoreComponent;
    debtDynamics: HealthScoreComponent;
    goals: HealthScoreComponent;
  };
  tips: string[];
  calculatedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtRub(value: number): string {
  return Math.round(value).toLocaleString("ru-RU") + " ₽";
}

export async function GET() {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  const [accounts, txLast30, txLast90, debts, recentPayments, plans] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId },
        select: { balance: true, currency: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          parentId: null,
          date: { gte: thirtyDaysAgo },
          type: { in: ["INCOME", "EXPENSE"] },
        },
        select: { type: true, amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          parentId: null,
          date: { gte: ninetyDaysAgo },
          type: "EXPENSE",
        },
        select: { amount: true },
      }),
      prisma.debt.findMany({
        where: { userId, direction: "I_OWE" },
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.debtPayment.findMany({
        where: {
          debt: { userId, direction: "I_OWE" },
          date: { gte: thirtyDaysAgo },
        },
        select: { amount: true },
      }),
      prisma.plan.findMany({
        where: { userId },
        select: { completed: true },
      }),
    ]);

  const income30 = txLast30
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + decimalToNumber(t.amount), 0);
  const expense30 = txLast30
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + decimalToNumber(t.amount), 0);

  let scoreIE = 50;
  let ieDetail = "Нет данных за 30 дней";

  if (income30 > 0 || expense30 > 0) {
    const ratio = income30 / Math.max(expense30, 1);
    scoreIE =
      ratio >= 1.5
        ? 100
        : ratio >= 1.3
          ? 85
          : ratio >= 1.1
            ? 70
            : ratio >= 1.0
              ? 55
              : ratio >= 0.85
                ? 35
                : ratio >= 0.7
                  ? 15
                  : 0;
    if (income30 <= 0) {
      ieDetail = `Доходов за 30 дней нет, расход ${fmtRub(expense30)}`;
    } else {
      const savingsRate = Math.round((1 - expense30 / income30) * 100);
      if (savingsRate > 0) {
        ieDetail = `Откладываешь ${savingsRate}% доходов`;
      } else if (savingsRate === 0) {
        ieDetail = "Тратишь столько же, сколько зарабатываешь";
      } else {
        ieDetail = `Дефицит ${Math.abs(savingsRate)}% от доходов`;
      }
    }
  }

  const liquid = accounts
    .filter((a) => a.currency === "RUB")
    .reduce((s, a) => s + decimalToNumber(a.balance), 0);
  const expense90 = txLast90.reduce(
    (s, t) => s + decimalToNumber(t.amount),
    0,
  );
  const avgMonthlyExpense = expense90 / 3;

  let scoreCushion = 80;
  let cushionDetail = "Расходов пока мало — недостаточно данных";
  let cushionNoData = true;

  if (avgMonthlyExpense > 0) {
    cushionNoData = false;
    const months = liquid / avgMonthlyExpense;
    scoreCushion =
      months >= 6
        ? 100
        : months >= 4
          ? 85
          : months >= 3
            ? 70
            : months >= 1.5
              ? 50
              : months >= 0.5
                ? 25
                : 0;
    cushionDetail =
      months >= 1
        ? `Подушка на ${months.toFixed(1)} мес. расходов`
        : `Подушка менее чем на месяц (${Math.max(0, Math.round(months * 30))} дн.)`;
  }

  const activeDebts = debts.filter((d) => d.status !== "CLOSED");
  const totalDebt = activeDebts.reduce((sum, d) => {
    const remaining =
      decimalToNumber(d.amount) - decimalToNumber(d.paidAmount);
    return sum + Math.max(0, remaining);
  }, 0);

  const recentPaymentsSum = recentPayments.reduce(
    (s, p) => s + decimalToNumber(p.amount),
    0,
  );

  const newDebtAmount = debts
    .filter((d) => d.createdAt >= thirtyDaysAgo)
    .reduce((s, d) => s + decimalToNumber(d.amount), 0);

  let scoreDebt = 100;
  let debtDetail = "Долгов нет — отлично";

  if (totalDebt > 0) {
    const debtChange = recentPaymentsSum - newDebtAmount;
    if (debtChange > 0) {
      const rate = recentPaymentsSum / totalDebt;
      scoreDebt =
        rate >= 0.1 ? 90 : rate >= 0.05 ? 75 : rate >= 0.02 ? 60 : 50;
      debtDetail = `Выплачено ${fmtRub(recentPaymentsSum)} за месяц`;
    } else if (debtChange === 0) {
      scoreDebt = 40;
      debtDetail = `Долг ${fmtRub(totalDebt)} не гасится`;
    } else {
      const growth = Math.abs(debtChange) / Math.max(totalDebt, 1);
      scoreDebt = growth >= 0.2 ? 5 : growth >= 0.1 ? 15 : 25;
      debtDetail = `Долг вырос на ${fmtRub(Math.abs(debtChange))}`;
    }
  }

  // ── Компонент 4: Достижение целей (Планы) ─────────────────────────────
  // Прямое соотношение «выполнено / всего». Если планов нет — даём дефолтные
  // 50 (нейтрально), не штрафуем за отсутствие планирования. Если планы есть
  // и ни один не отмечен выполненным — балл 0. Чем больше выполнено, тем выше.
  let scoreGoals = 50;
  let goalsDetail = "Планов нет — создай первый";
  let goalsNoData = true;

  if (plans.length > 0) {
    goalsNoData = false;
    const completed = plans.filter((p) => p.completed).length;
    scoreGoals = Math.round((completed / plans.length) * 100);
    goalsDetail = `Выполнено ${completed} из ${plans.length}`;
  }

  const score = Math.round(
    scoreIE * 0.3 + scoreCushion * 0.25 + scoreDebt * 0.25 + scoreGoals * 0.2,
  );

  const zone: HealthZone =
    score >= 80
      ? "excellent"
      : score >= 60
        ? "good"
        : score >= 40
          ? "coping"
          : "vulnerable";

  const sorted = [
    {
      score: scoreIE,
      tip: "Расходы близки к доходам — найди и сократи 1–2 крупные статьи трат.",
    },
    {
      score: scoreCushion,
      tip: cushionNoData
        ? "Добавь регулярные расходы, чтобы оценить подушку безопасности."
        : "Подушка безопасности мала. Цель — отложить хотя бы 1 месяц расходов.",
    },
    {
      score: scoreDebt,
      tip: "Долги растут. Попробуй ежемесячно закрывать хоть небольшую часть.",
    },
    {
      score: scoreGoals,
      tip: goalsNoData
        ? "Создай первый финансовый план — это даст точку отсчёта."
        : "Планы выполняются не полностью. Проверь, реалистичны ли суммы.",
    },
  ].sort((a, b) => a.score - b.score);

  const tips: string[] = [];
  for (const s of sorted.slice(0, 2)) {
    if (s.score < 70) tips.push(s.tip);
  }
  if (tips.length === 0) {
    tips.push(
      "Всё отлично! Продолжай фиксировать операции для точного расчёта.",
    );
  }

  const body: HealthScoreResponse = {
    score,
    zone,
    components: {
      incomeExpense: {
        score: scoreIE,
        label: "Доходы / Расходы",
        detail: ieDetail,
        weight: 30,
      },
      cushion: {
        score: scoreCushion,
        label: "Подушка безопасности",
        detail: cushionDetail,
        weight: 25,
        noData: cushionNoData,
      },
      debtDynamics: {
        score: scoreDebt,
        label: "Динамика долгов",
        detail: debtDetail,
        weight: 25,
      },
      goals: {
        score: scoreGoals,
        label: "Выполнение планов",
        detail: goalsDetail,
        weight: 20,
        noData: goalsNoData,
      },
    },
    tips,
    calculatedAt: now.toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
