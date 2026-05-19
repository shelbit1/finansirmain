import Link from "next/link";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Coins,
  HandCoins,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireActiveSubscription, requireUser } from "@/lib/dal";
import {
  decimalToNumber,
  endOfMonth,
  formatDateShort,
  formatMoney,
  percentChange,
  startOfMonth,
} from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddTransactionButton } from "@/components/app/transactions/TransactionsList";
import type { DebtOption } from "@/components/app/transactions/TransactionForm";
import { DailyChart } from "@/components/app/dashboard/DailyChart";

export const metadata = { title: "Дашборд — Финансыр" };

export default async function DashboardPage() {
  await requireActiveSubscription();
  const user = await requireUser();
  const userId = user.id;

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [
    accounts,
    monthlyTx,
    recent,
    activeDebts,
    allDebtPeople,
    assets,
    incomeCategories,
    expenseCategories,
    accountOpts,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "asc" },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        incomeCategory: { select: { name: true, icon: true } },
        expenseCategory: { select: { name: true, icon: true } },
        fromAccount: { select: { name: true, currency: true } },
        toAccount: { select: { name: true, currency: true } },
      },
    }),
    prisma.debt.findMany({
      where: { userId, status: { not: "CLOSED" } },
      select: {
        id: true,
        direction: true,
        amount: true,
        paidAmount: true,
        personName: true,
        currency: true,
      },
    }),
    prisma.debt.findMany({
      where: { userId },
      select: { personName: true },
      distinct: ["personName"],
      orderBy: { personName: "asc" },
    }),
    prisma.asset.findMany({ where: { userId }, select: { purchasePrice: true, currentValue: true } }),
    prisma.incomeCategory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  const totalBalance = accounts
    .filter((a) => a.currency === "RUB")
    .reduce((s, a) => s + decimalToNumber(a.balance), 0);

  const monthIncome = monthlyTx
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + decimalToNumber(t.amount), 0);
  const monthExpense = monthlyTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + decimalToNumber(t.amount), 0);
  const monthNet = monthIncome - monthExpense;

  const owed = activeDebts
    .filter((d) => d.direction === "I_OWE")
    .reduce((s, d) => s + (decimalToNumber(d.amount) - decimalToNumber(d.paidAmount)), 0);
  const credit = activeDebts
    .filter((d) => d.direction === "OWED_TO_ME")
    .reduce((s, d) => s + (decimalToNumber(d.amount) - decimalToNumber(d.paidAmount)), 0);

  const debtOptions: DebtOption[] = activeDebts.map((d) => {
    const amount = decimalToNumber(d.amount);
    const paid = decimalToNumber(d.paidAmount);
    return {
      id: d.id,
      direction: d.direction,
      personName: d.personName,
      amount,
      remaining: Math.max(amount - paid, 0),
      currency: d.currency,
    };
  });

  const personNames = allDebtPeople
    .map((d) => d.personName)
    .filter((n): n is string => Boolean(n));

  const assetValue = assets.reduce((s, a) => s + decimalToNumber(a.currentValue), 0);
  const assetCost = assets.reduce((s, a) => s + decimalToNumber(a.purchasePrice), 0);
  const assetPct = percentChange(assetValue, assetCost);

  const dailyMap = new Map<string, { income: number; expense: number }>();
  for (
    let d = new Date(monthStart);
    d <= monthEnd;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of monthlyTx) {
    const key = t.date.toISOString().slice(0, 10);
    const slot = dailyMap.get(key);
    if (!slot) continue;
    if (t.type === "INCOME") slot.income += decimalToNumber(t.amount);
    if (t.type === "EXPENSE") slot.expense += decimalToNumber(t.amount);
  }
  const chartData = Array.from(dailyMap.entries()).map(([date, v]) => ({
    label: formatDateShort(date),
    income: v.income,
    expense: v.expense,
  }));

  return (
    <>
      <PageHeader
        title={`Привет, ${user.name ?? user.email.split("@")[0]}`}
        subtitle="Ваш текущий финансовый снимок"
        action={
          <AddTransactionButton
            accounts={accountOpts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            debts={debtOptions}
            personNames={personNames}
          />
        }
      />

      <div className="space-y-4">
        <div className="card p-5 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <Wallet className="w-4 h-4 shrink-0" />
            Общий баланс
          </div>
          <p className="font-display text-3xl sm:text-4xl font-bold tnum truncate">
            {formatMoney(totalBalance, "RUB")}
          </p>
          <p className="text-xs text-text-muted mt-1">
            По {accounts.length} счёт{accounts.length === 1 ? "у" : accounts.length < 5 ? "ам" : "ам"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile
            label="Доход за месяц"
            value={formatMoney(monthIncome, "RUB")}
            color="var(--color-income)"
            icon={ArrowDown}
          />
          <Tile
            label="Расход за месяц"
            value={formatMoney(monthExpense, "RUB")}
            color="var(--color-expense)"
            icon={ArrowUp}
          />
          <Tile
            label="Чистый результат"
            value={formatMoney(monthNet, "RUB")}
            color={monthNet >= 0 ? "var(--color-income)" : "var(--color-expense)"}
            icon={monthNet >= 0 ? TrendingUp : TrendingDown}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <Tile
            label="Я должен"
            value={formatMoney(owed, "RUB")}
            color="var(--color-debt-owe)"
            icon={HandCoins}
            href="/debts"
          />
          <Tile
            label="Мне должны"
            value={formatMoney(credit, "RUB")}
            color="var(--color-debt-get)"
            icon={HandCoins}
            href="/debts"
          />
          <div className="card card-hover p-3 sm:p-4 col-span-2 sm:col-span-1 min-w-0">
            <Link href="/assets" className="block min-w-0">
              <div className="flex items-center gap-1.5 text-text-muted text-xs sm:text-sm mb-1 min-w-0">
                <Coins
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--color-asset)" }}
                />
                <span className="truncate">Стоимость активов</span>
              </div>
              <p className="font-display text-lg sm:text-2xl font-bold tnum truncate">
                {formatMoney(assetValue, "RUB")}
              </p>
              {assetCost > 0 && (
                <p
                  className="text-xs sm:text-sm font-medium tnum"
                  style={{
                    color: assetPct >= 0 ? "var(--color-income)" : "var(--color-expense)",
                  }}
                >
                  {assetPct >= 0 ? "↑" : "↓"} {Math.abs(assetPct).toFixed(1)}%
                </p>
              )}
            </Link>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold mb-3">Доходы и расходы в этом месяце</h3>
          <DailyChart data={chartData} />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 pb-2">
            <h3 className="font-display text-lg font-semibold">Последние операции</h3>
            <Link href="/transactions" className="text-sm text-primary font-medium">
              Все →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 pb-5 text-text-muted text-sm">
              Операций пока нет — добавьте первую через кнопку выше.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((t) => {
                const conf =
                  t.type === "INCOME"
                    ? { icon: ArrowDown, color: "var(--color-income)", sign: "+" }
                    : t.type === "EXPENSE"
                    ? { icon: ArrowUp, color: "var(--color-expense)", sign: "−" }
                    : { icon: ArrowLeftRight, color: "var(--color-transfer)", sign: "" };
                const Icon = conf.icon;
                const cat = t.incomeCategory ?? t.expenseCategory;
                const currency = t.toAccount?.currency ?? t.fromAccount?.currency ?? "RUB";
                return (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${conf.color} 14%, transparent)` }}
                    >
                      {cat?.icon ? (
                        <span className="text-lg">{cat.icon}</span>
                      ) : (
                        <Icon className="w-4 h-4" style={{ color: conf.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {cat?.name ?? (t.type === "TRANSFER" ? "Перемещение" : "—")}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {formatDateShort(t.date)}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <p
                      className="font-semibold tnum text-sm shrink-0"
                      style={{ color: conf.color }}
                    >
                      {conf.sign}
                      {formatMoney(decimalToNumber(t.amount), currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  color,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-text-muted text-xs sm:text-sm mb-1 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <span className="truncate">{label}</span>
      </div>
      <p
        className="font-display text-lg sm:text-2xl font-bold tnum truncate"
        style={{ color }}
      >
        {value}
      </p>
    </>
  );
  return (
    <div className="card card-hover p-3 sm:p-4 min-w-0">
      {href ? <Link href={href}>{content}</Link> : content}
    </div>
  );
}
