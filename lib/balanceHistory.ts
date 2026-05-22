import "server-only";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { assetTypeLabel } from "@/lib/assetTypes";
import type {
  AssetBreakdownItem,
  BalanceHistoryResponse,
  BalancePoint,
  DebtDetail,
  Granularity,
} from "@/lib/balanceHistoryTypes";
import type { AssetType } from "@prisma/client";

type DebtWithPayments = {
  amount: unknown;
  currency: string;
  status: "ACTIVE" | "PARTIALLY_PAID" | "CLOSED";
  direction: "I_OWE" | "OWED_TO_ME";
  personName: string;
  createdAt: Date;
  payments: { amount: unknown; date: Date }[];
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Каждая точка — «состояние на КОНЕЦ этого дня».
 * Финальная точка всегда совпадает с `to`, чтобы последний столбец отражал «сейчас»
 * (включая активы и транзакции, появившиеся сегодня).
 */
function generatePoints(from: Date, to: Date, granularity: Granularity): Date[] {
  const points: Date[] = [];
  const cur = new Date(from);
  cur.setHours(23, 59, 59, 999);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    points.push(new Date(cur));
    if (granularity === "day") cur.setDate(cur.getDate() + 1);
    else if (granularity === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  const last = points[points.length - 1];
  if (!last || !sameDay(last, end)) {
    points.push(new Date(end));
  }
  return points;
}

function remainingAt(debt: DebtWithPayments, point: Date): number {
  const paid = debt.payments
    .filter((p) => p.date <= point)
    .reduce((s, p) => s + decimalToNumber(p.amount), 0);
  return Math.max(0, decimalToNumber(debt.amount) - paid);
}

function detail(debt: DebtWithPayments): DebtDetail {
  const paid = debt.payments.reduce((s, p) => s + decimalToNumber(p.amount), 0);
  return {
    personName: debt.personName,
    remaining: Math.max(0, decimalToNumber(debt.amount) - paid),
    currency: debt.currency,
    direction: debt.direction,
  };
}

export async function computeBalanceHistory(
  userId: string,
  from: Date,
  to: Date,
  granularity: Granularity,
): Promise<BalanceHistoryResponse> {
  const [accounts, transactions, assets, iOweDebts, owedToMeDebts] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, parentId: null },
      orderBy: { date: "desc" },
      select: {
        type: true,
        amount: true,
        date: true,
        fromAccountId: true,
        toAccountId: true,
      },
    }),
    prisma.asset.findMany({
      where: { userId },
      include: { valueHistory: { orderBy: { date: "asc" } } },
    }),
    prisma.debt.findMany({
      where: { userId, direction: "I_OWE" },
      include: {
        payments: { orderBy: { date: "asc" }, select: { amount: true, date: true } },
      },
    }),
    prisma.debt.findMany({
      where: { userId, direction: "OWED_TO_ME" },
      include: {
        payments: { orderBy: { date: "asc" }, select: { amount: true, date: true } },
      },
    }),
  ]);

  // --- Текущие значения ---
  const currentLiquid = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);
  const currentAssets = assets.reduce((s, a) => s + decimalToNumber(a.currentValue), 0);

  const activeReceivables = owedToMeDebts.filter((d) => d.status !== "CLOSED");
  const activeLiabilities = iOweDebts.filter((d) => d.status !== "CLOSED");
  const currentReceivables = activeReceivables.reduce(
    (s, d) => s + detail(d).remaining,
    0,
  );
  const currentLiabilities = activeLiabilities.reduce(
    (s, d) => s + detail(d).remaining,
    0,
  );
  const currentNetWorth =
    currentLiquid + currentAssets + currentReceivables - currentLiabilities;

  // --- Детализация ---
  const accountsBreakdown = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    color: a.color,
    balance: decimalToNumber(a.balance),
    currency: a.currency,
  }));

  const assetsByType = new Map<AssetType, { totalValue: number; totalCost: number; count: number }>();
  for (const a of assets) {
    const existing = assetsByType.get(a.type) ?? { totalValue: 0, totalCost: 0, count: 0 };
    existing.totalValue += decimalToNumber(a.currentValue);
    existing.totalCost += decimalToNumber(a.purchasePrice);
    existing.count += 1;
    assetsByType.set(a.type, existing);
  }
  const assetsBreakdown: AssetBreakdownItem[] = Array.from(assetsByType.entries())
    .map(([type, data]) => ({
      type,
      label: assetTypeLabel(type),
      ...data,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const receivablesDetail = activeReceivables.map(detail);
  const liabilitiesDetail = activeLiabilities.map(detail);

  // --- Исторические точки: идём от to → from, откатывая транзакции ---
  const points = generatePoints(from, to, granularity);

  const balanceMap = new Map<string, number>();
  accounts.forEach((a) => balanceMap.set(a.id, decimalToNumber(a.balance)));

  const historicalPoints: BalancePoint[] = [];
  let txIdx = 0;

  for (let i = points.length - 1; i >= 0; i--) {
    const pointDate = points[i];

    while (txIdx < transactions.length && transactions[txIdx].date > pointDate) {
      const tx = transactions[txIdx];
      const amount = decimalToNumber(tx.amount);
      switch (tx.type) {
        case "INCOME":
          if (tx.toAccountId)
            balanceMap.set(tx.toAccountId, (balanceMap.get(tx.toAccountId) ?? 0) - amount);
          break;
        case "EXPENSE":
          if (tx.fromAccountId)
            balanceMap.set(tx.fromAccountId, (balanceMap.get(tx.fromAccountId) ?? 0) + amount);
          break;
        case "TRANSFER":
          if (tx.fromAccountId)
            balanceMap.set(tx.fromAccountId, (balanceMap.get(tx.fromAccountId) ?? 0) + amount);
          if (tx.toAccountId)
            balanceMap.set(tx.toAccountId, (balanceMap.get(tx.toAccountId) ?? 0) - amount);
          break;
        case "DEBT_TAKE":
          if (tx.toAccountId)
            balanceMap.set(tx.toAccountId, (balanceMap.get(tx.toAccountId) ?? 0) - amount);
          break;
        case "DEBT_RETURN":
          if (tx.fromAccountId)
            balanceMap.set(tx.fromAccountId, (balanceMap.get(tx.fromAccountId) ?? 0) + amount);
          break;
        case "DEBT_GIVE":
          if (tx.fromAccountId)
            balanceMap.set(tx.fromAccountId, (balanceMap.get(tx.fromAccountId) ?? 0) + amount);
          break;
        case "DEBT_RECEIVE":
          if (tx.toAccountId)
            balanceMap.set(tx.toAccountId, (balanceMap.get(tx.toAccountId) ?? 0) - amount);
          break;
        case "ASSET_BUY":
          if (tx.fromAccountId)
            balanceMap.set(tx.fromAccountId, (balanceMap.get(tx.fromAccountId) ?? 0) + amount);
          break;
      }
      txIdx++;
    }

    const liquidAtPoint = Array.from(balanceMap.values()).reduce((s, v) => s + v, 0);

    let assetsAtPoint = 0;
    for (const asset of assets) {
      // Дата владения активом: предпочитаем purchaseDate (фактическую), иначе createdAt.
      const ownedSince = asset.purchaseDate ?? asset.createdAt;
      if (ownedSince > pointDate) continue;
      const history = asset.valueHistory.filter((h) => h.date <= pointDate);
      if (history.length > 0) {
        assetsAtPoint += decimalToNumber(history[history.length - 1].value);
      } else {
        assetsAtPoint += decimalToNumber(asset.purchasePrice);
      }
    }

    let receivablesAtPoint = 0;
    for (const debt of owedToMeDebts) {
      if (debt.createdAt > pointDate) continue;
      receivablesAtPoint += remainingAt(debt, pointDate);
    }
    let liabilitiesAtPoint = 0;
    for (const debt of iOweDebts) {
      if (debt.createdAt > pointDate) continue;
      liabilitiesAtPoint += remainingAt(debt, pointDate);
    }

    historicalPoints.unshift({
      date: pointDate.toISOString().slice(0, 10),
      liquid: Math.round(liquidAtPoint),
      assets: Math.round(assetsAtPoint),
      receivables: Math.round(receivablesAtPoint),
      liabilities: Math.round(liabilitiesAtPoint),
      netWorth: Math.round(
        liquidAtPoint + assetsAtPoint + receivablesAtPoint - liabilitiesAtPoint,
      ),
    });
  }

  const firstNetWorth = historicalPoints[0]?.netWorth ?? 0;
  const lastNetWorth = historicalPoints[historicalPoints.length - 1]?.netWorth ?? 0;
  const change = {
    amount: lastNetWorth - firstNetWorth,
    percent:
      firstNetWorth !== 0
        ? ((lastNetWorth - firstNetWorth) / Math.abs(firstNetWorth)) * 100
        : 0,
  };

  return {
    points: historicalPoints,
    current: {
      liquid: Math.round(currentLiquid),
      assets: Math.round(currentAssets),
      receivables: Math.round(currentReceivables),
      liabilities: Math.round(currentLiabilities),
      netWorth: Math.round(currentNetWorth),
      accountsBreakdown,
      assetsBreakdown,
      receivablesDetail,
      liabilitiesDetail,
    },
    change,
    range: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      granularity,
    },
  };
}
