import "server-only";
import { Prisma, type DebtStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

function computeStatus(amount: Prisma.Decimal, paid: Prisma.Decimal): DebtStatus {
  if (paid.greaterThanOrEqualTo(amount)) return "CLOSED";
  if (paid.greaterThan(0)) return "PARTIALLY_PAID";
  return "ACTIVE";
}

export async function recalcDebt(tx: Prisma.TransactionClient, debtId: string) {
  const debt = await tx.debt.findUnique({
    where: { id: debtId },
    include: { payments: true },
  });
  if (!debt) return null;

  const paid = debt.payments.reduce(
    (acc, p) => acc.add(p.amount),
    new Prisma.Decimal(0),
  );
  const status = computeStatus(debt.amount, paid);

  return tx.debt.update({
    where: { id: debtId },
    data: { paidAmount: paid, status },
  });
}

/**
 * Пересчитывает `amount` долга как сумму всех связанных операций-источников
 * (DEBT_TAKE/DEBT_GIVE), затем обновляет статус и paidAmount. Используется,
 * когда несколько операций займа от одного человека объединены в одну запись
 * раздела «Долги».
 *
 * Возвращает обновлённый долг или `null`, если источников не осталось
 * (вызывающий код должен сам решить, удалять ли пустой Debt).
 */
export async function syncDebtFromTransactions(
  tx: Prisma.TransactionClient,
  debtId: string,
) {
  const sources = await tx.transaction.findMany({
    where: { debtId, type: { in: ["DEBT_TAKE", "DEBT_GIVE"] } },
    select: { amount: true },
  });
  if (sources.length === 0) return null;

  const total = sources.reduce(
    (acc, t) => acc.add(t.amount),
    new Prisma.Decimal(0),
  );
  await tx.debt.update({ where: { id: debtId }, data: { amount: total } });
  return recalcDebt(tx, debtId);
}

export async function addPayment(
  userId: string,
  debtId: string,
  data: { amount: number; date: Date; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({ where: { id: debtId } });
    if (!debt || debt.userId !== userId) throw new Error("Долг не найден");

    await tx.debtPayment.create({
      data: { debtId, amount: data.amount, date: data.date, note: data.note },
    });
    return recalcDebt(tx, debtId);
  });
}

export async function deletePayment(userId: string, debtId: string, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({ where: { id: debtId } });
    if (!debt || debt.userId !== userId) throw new Error("Долг не найден");

    const payment = await tx.debtPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.debtId !== debtId) throw new Error("Платёж не найден");

    await tx.debtPayment.delete({ where: { id: paymentId } });
    return recalcDebt(tx, debtId);
  });
}

function debtGroupKey(d: {
  direction: string;
  currency: string;
  personName: string;
}): string {
  return `${d.direction}|${d.currency}|${d.personName.trim().toLowerCase()}`;
}

/** Количество групп активных долгов с одинаковыми именем/направлением/валютой. */
export async function countDebtDuplicateGroups(userId: string): Promise<number> {
  const debts = await prisma.debt.findMany({
    where: { userId, status: { not: "CLOSED" } },
    select: { direction: true, currency: true, personName: true },
  });
  const counts = new Map<string, number>();
  for (const d of debts) {
    const key = debtGroupKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let groups = 0;
  for (const c of counts.values()) if (c > 1) groups += 1;
  return groups;
}

/**
 * Сливает дубликаты долгов пользователя: в каждой группе с одинаковыми
 * направлением, валютой и именем (без учёта регистра/пробелов) оставляет
 * самый ранний по `createdAt` долг (canonical), переносит в него все
 * операции-источники и платежи из остальных, пересчитывает сумму/статус и
 * удаляет освободившиеся записи. Закрытые долги не трогаются.
 *
 * Каждая группа сливается отдельной короткой транзакцией: так до Yandex
 * Pooler не доходят длинные `$transaction` и одно медленное соединение не
 * валит весь батч. Если конкретная группа упала — остальные всё равно
 * сольются, пользователь нажмёт «Объединить» ещё раз.
 */
export async function mergeDebtDuplicates(userId: string) {
  const debts = await prisma.debt.findMany({
    where: { userId, status: { not: "CLOSED" } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof debts>();
  for (const d of debts) {
    const key = debtGroupKey(d);
    const arr = groups.get(key) ?? [];
    arr.push(d);
    groups.set(key, arr);
  }

  const dupeGroups = Array.from(groups.values()).filter((g) => g.length > 1);
  if (dupeGroups.length === 0) {
    return { mergedGroups: 0, removedDebts: 0 };
  }

  let mergedGroups = 0;
  let removedDebts = 0;

  for (const group of dupeGroups) {
    const [canonical, ...rest] = group;
    const restIds = rest.map((d) => d.id);

    await prisma.$transaction(
      async (tx) => {
        await tx.transaction.updateMany({
          where: { debtId: { in: restIds } },
          data: { debtId: canonical.id },
        });
        await tx.debtPayment.updateMany({
          where: { debtId: { in: restIds } },
          data: { debtId: canonical.id },
        });
        await tx.debt.deleteMany({ where: { id: { in: restIds } } });
        await syncDebtFromTransactions(tx, canonical.id);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    mergedGroups += 1;
    removedDebts += rest.length;
  }

  return { mergedGroups, removedDebts };
}
