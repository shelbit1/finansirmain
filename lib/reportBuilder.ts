import "server-only";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { DEBT_LABELS, DEBT_TYPES, type DebtType } from "@/lib/transactionMeta";

export type ReportGranularity = "day" | "week" | "month";

export type ReportPeriod = {
  key: string;
  label: string;
  from: Date;
  to: Date;
};

export type ReportRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  byPeriod: number[];
  total: number;
};

export type ReportSection = {
  rows: ReportRow[];
  byPeriod: number[];
  total: number;
};

export type ReportData = {
  from: Date;
  to: Date;
  granularity: ReportGranularity;
  periods: ReportPeriod[];
  income: ReportSection;
  expense: ReportSection;
  debt: ReportSection;
  saldoByPeriod: number[];
  saldoTotal: number;
};

const monthShort = new Intl.DateTimeFormat("ru-RU", { month: "short" });
const monthYear = new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const dow = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - dow);
  return out;
}
function startOfMonthDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function autoGranularity(from: Date, to: Date): ReportGranularity {
  const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function buildPeriods(
  from: Date,
  to: Date,
  granularity: ReportGranularity,
): ReportPeriod[] {
  const periods: ReportPeriod[] = [];
  const limit = endOfDay(to);

  if (granularity === "day") {
    for (let cur = startOfDay(from); cur <= limit; cur.setDate(cur.getDate() + 1)) {
      const start = new Date(cur);
      const end = endOfDay(start);
      periods.push({
        key: start.toISOString().slice(0, 10),
        label: dayMonth.format(start),
        from: start,
        to: end,
      });
    }
  } else if (granularity === "week") {
    let cur = startOfWeek(from);
    while (cur <= limit) {
      const start = new Date(cur);
      const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
      periods.push({
        key: `w-${start.toISOString().slice(0, 10)}`,
        label: `${dayMonth.format(start)}–${dayMonth.format(end)}`,
        from: start,
        to: end,
      });
      cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    }
  } else {
    let cur = startOfMonthDate(from);
    while (cur <= limit) {
      const start = new Date(cur);
      const end = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));
      const labelFmt =
        start.getFullYear() !== to.getFullYear() || from.getFullYear() !== to.getFullYear()
          ? monthYear
          : monthShort;
      periods.push({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        label: labelFmt.format(start),
        from: start,
        to: end,
      });
      cur = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
  }

  return periods;
}

function bucketIndex(periods: ReportPeriod[], date: Date): number {
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (date >= p.from && date <= p.to) return i;
  }
  return -1;
}

export async function buildReport(
  userId: string,
  from: Date,
  to: Date,
  granularity: ReportGranularity,
): Promise<ReportData> {
  const periods = buildPeriods(from, to, granularity);
  const empty = () => Array<number>(periods.length).fill(0);

  const [incomeTx, expenseTx, debtTx, incomeCategories, expenseCategories] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, type: "INCOME", date: { gte: from, lte: endOfDay(to) } },
        select: { amount: true, date: true, incomeCategoryId: true },
      }),
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", date: { gte: from, lte: endOfDay(to) } },
        select: { amount: true, date: true, expenseCategoryId: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: { in: DEBT_TYPES as unknown as TransactionType[] },
          date: { gte: from, lte: endOfDay(to) },
        },
        select: { amount: true, date: true, type: true },
      }),
      prisma.incomeCategory.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, icon: true, color: true },
      }),
      prisma.expenseCategory.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, icon: true, color: true },
      }),
    ]);

  function aggregate(
    txs: { amount: unknown; date: Date; key: string | null }[],
    categories: { id: string; name: string; icon: string | null; color: string | null }[],
  ): ReportSection {
    const rowsMap = new Map<string, ReportRow>();
    for (const c of categories) {
      rowsMap.set(c.id, {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        byPeriod: empty(),
        total: 0,
      });
    }
    const orphan: ReportRow = {
      id: "__none__",
      name: "Без категории",
      icon: null,
      color: null,
      byPeriod: empty(),
      total: 0,
    };

    const sectionByPeriod = empty();
    let sectionTotal = 0;

    for (const t of txs) {
      const idx = bucketIndex(periods, t.date);
      if (idx < 0) continue;
      const amount = decimalToNumber(t.amount);
      const row = t.key ? rowsMap.get(t.key) ?? orphan : orphan;
      row.byPeriod[idx] += amount;
      row.total += amount;
      sectionByPeriod[idx] += amount;
      sectionTotal += amount;
    }

    const rows = [...rowsMap.values()].filter((r) => r.total > 0);
    rows.sort((a, b) => b.total - a.total);
    if (orphan.total > 0) rows.push(orphan);

    return { rows, byPeriod: sectionByPeriod, total: sectionTotal };
  }

  const income = aggregate(
    incomeTx.map((t) => ({ amount: t.amount, date: t.date, key: t.incomeCategoryId })),
    incomeCategories,
  );
  const expense = aggregate(
    expenseTx.map((t) => ({ amount: t.amount, date: t.date, key: t.expenseCategoryId })),
    expenseCategories,
  );

  // Секция «Долги»: 4 фиксированные строки по подтипам, не влияет на сальдо
  const debtRows: Record<DebtType, ReportRow> = {
    DEBT_TAKE: makeDebtRow("DEBT_TAKE", periods.length),
    DEBT_RETURN: makeDebtRow("DEBT_RETURN", periods.length),
    DEBT_GIVE: makeDebtRow("DEBT_GIVE", periods.length),
    DEBT_RECEIVE: makeDebtRow("DEBT_RECEIVE", periods.length),
  };
  const debtByPeriod = empty();
  let debtTotal = 0;
  for (const t of debtTx) {
    const idx = bucketIndex(periods, t.date);
    if (idx < 0) continue;
    const amount = decimalToNumber(t.amount);
    const row = debtRows[t.type as DebtType];
    row.byPeriod[idx] += amount;
    row.total += amount;
    debtByPeriod[idx] += amount;
    debtTotal += amount;
  }
  const debt: ReportSection = {
    rows: DEBT_TYPES.map((id) => debtRows[id]),
    byPeriod: debtByPeriod,
    total: debtTotal,
  };

  const saldoByPeriod = periods.map((_, i) => income.byPeriod[i] - expense.byPeriod[i]);
  const saldoTotal = income.total - expense.total;

  return {
    from,
    to,
    granularity,
    periods,
    income,
    expense,
    debt,
    saldoByPeriod,
    saldoTotal,
  };
}

function makeDebtRow(type: DebtType, periodCount: number): ReportRow {
  return {
    id: type,
    name: DEBT_LABELS[type],
    icon: null,
    color: null,
    byPeriod: Array<number>(periodCount).fill(0),
    total: 0,
  };
}
