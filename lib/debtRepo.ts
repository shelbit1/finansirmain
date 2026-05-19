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
