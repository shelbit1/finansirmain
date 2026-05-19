import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddTransactionButton,
  TransactionsList,
  type TransactionWithRefs,
} from "@/components/app/transactions/TransactionsList";
import { decimalToNumber } from "@/lib/utils";

export const metadata = { title: "Операции — Финансыр" };

export default async function TransactionsPage() {
  const userId = await requireUserId();

  const [items, accounts, incomeCategories, expenseCategories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        incomeCategory: { select: { id: true, name: true, icon: true, color: true } },
        expenseCategory: { select: { id: true, name: true, icon: true, color: true } },
        fromAccount: { select: { id: true, name: true, icon: true, color: true, currency: true } },
        toAccount: { select: { id: true, name: true, icon: true, color: true, currency: true } },
        derived: { select: { amount: true } },
      },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
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
  ]);

  const dto: TransactionWithRefs[] = items.map((t) => ({
    id: t.id,
    type: t.type,
    amount: decimalToNumber(t.amount),
    date: t.date.toISOString(),
    note: t.note,
    incomeCategoryId: t.incomeCategoryId,
    expenseCategoryId: t.expenseCategoryId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    interestAmount:
      t.type === "DEBT_RETURN" && t.derived.length > 0
        ? t.derived.reduce((sum, d) => sum + decimalToNumber(d.amount), 0)
        : null,
    incomeCategory: t.incomeCategory,
    expenseCategory: t.expenseCategory,
    fromAccount: t.fromAccount,
    toAccount: t.toAccount,
  }));

  return (
    <>
      <PageHeader
        title="Операции"
        subtitle="Доходы, расходы и перемещения между счетами"
        action={
          <AddTransactionButton
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        }
      />
      <TransactionsList
        items={dto}
        accounts={accounts}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />
    </>
  );
}
