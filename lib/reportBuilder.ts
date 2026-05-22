import "server-only";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import {
  ASSET_CATEGORIES,
  assetCategory,
  type AssetCategory,
} from "@/lib/assetTypes";
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
  /**
   * Дочерние строки (подкатегории) для разворачивающейся группы.
   * Родительская строка включает агрегированные значения по всем детям.
   */
  children?: ReportRow[];
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
  asset: ReportSection;
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

  const [incomeTx, expenseTx, assetTx, debtTx, incomeCategories, expenseCategories] =
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
          type: "ASSET_BUY",
          date: { gte: from, lte: endOfDay(to) },
        },
        select: {
          amount: true,
          date: true,
          asset: { select: { type: true } },
        },
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
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, icon: true, color: true, parentId: true },
      }),
      prisma.expenseCategory.findMany({
        where: { userId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, icon: true, color: true, parentId: true },
      }),
    ]);

  function aggregate(
    txs: { amount: unknown; date: Date; key: string | null }[],
    categories: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
      parentId: string | null;
    }[],
  ): ReportSection {
    type InternalRow = ReportRow & { parentId: string | null };
    const rowsMap = new Map<string, InternalRow>();
    for (const c of categories) {
      rowsMap.set(c.id, {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        byPeriod: empty(),
        total: 0,
        parentId: c.parentId,
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

    // Раскладываем в дерево: parent → children
    const childrenByParent = new Map<string, InternalRow[]>();
    const roots: InternalRow[] = [];
    for (const r of rowsMap.values()) {
      if (r.parentId && rowsMap.has(r.parentId)) {
        const arr = childrenByParent.get(r.parentId) ?? [];
        arr.push(r);
        childrenByParent.set(r.parentId, arr);
      } else {
        roots.push(r);
      }
    }

    // Сначала фильтруем/сортируем детей, затем агрегируем их суммы в родителя.
    for (const root of roots) {
      const kids = childrenByParent.get(root.id);
      if (!kids) continue;
      const visibleKids = kids
        .filter((k) => k.total > 0)
        .sort((a, b) => b.total - a.total);
      if (visibleKids.length === 0) continue;
      for (const kid of visibleKids) {
        root.total += kid.total;
        for (let i = 0; i < periods.length; i++) {
          root.byPeriod[i] += kid.byPeriod[i];
        }
      }
      root.children = visibleKids.map(stripInternal);
    }

    const rows = roots
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .map(stripInternal);
    if (orphan.total > 0) rows.push(orphan);

    return { rows, byPeriod: sectionByPeriod, total: sectionTotal };
  }

  // Возвращает чистую ReportRow без служебного parentId.
  function stripInternal(r: ReportRow & { parentId?: string | null }): ReportRow {
    const { parentId: _omit, ...rest } = r;
    void _omit;
    return rest;
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

  // Секция «Активы»: покупки ASSET_BUY по категории актива, не влияет на сальдо.
  // Все исторические типы (BUSINESS/STOCKS/CRYPTO/…) сводятся к одной из трёх
  // видимых категорий: REAL_ESTATE, VEHICLE, OTHER.
  const assetRowsMap = new Map<AssetCategory, ReportRow>();
  for (const cat of ASSET_CATEGORIES) {
    assetRowsMap.set(cat.id, {
      id: cat.id,
      name: cat.label,
      icon: null,
      color: null,
      byPeriod: empty(),
      total: 0,
    });
  }
  const assetOrphan: ReportRow = {
    id: "__none__",
    name: "Без типа",
    icon: null,
    color: null,
    byPeriod: empty(),
    total: 0,
  };
  const assetByPeriod = empty();
  let assetTotal = 0;
  for (const t of assetTx) {
    const idx = bucketIndex(periods, t.date);
    if (idx < 0) continue;
    const amount = decimalToNumber(t.amount);
    const type = t.asset?.type;
    const row = type
      ? (assetRowsMap.get(assetCategory(type)) ?? assetOrphan)
      : assetOrphan;
    row.byPeriod[idx] += amount;
    row.total += amount;
    assetByPeriod[idx] += amount;
    assetTotal += amount;
  }
  const assetRows = [...assetRowsMap.values()].filter((r) => r.total > 0);
  assetRows.sort((a, b) => b.total - a.total);
  if (assetOrphan.total > 0) assetRows.push(assetOrphan);
  const asset: ReportSection = {
    rows: assetRows,
    byPeriod: assetByPeriod,
    total: assetTotal,
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
    asset,
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
