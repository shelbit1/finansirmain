import "server-only";
import { Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";

type CreateInput = {
  userId: string;
  type: TransactionType;
  amount: number;
  date: Date;
  note?: string;
  incomeCategoryId?: string | null;
  expenseCategoryId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  interestAmount?: number | null;
};

const INTEREST_CATEGORY_NAME = "Проценты по долгу";

function isIncomingDebt(type: TransactionType): boolean {
  return type === "DEBT_TAKE" || type === "DEBT_RECEIVE";
}

function isOutgoingDebt(type: TransactionType): boolean {
  return type === "DEBT_RETURN" || type === "DEBT_GIVE";
}

async function applyBalance(
  tx: Prisma.TransactionClient,
  type: TransactionType,
  amount: number | Prisma.Decimal,
  fromAccountId: string | null | undefined,
  toAccountId: string | null | undefined,
  sign: 1 | -1,
) {
  const dec = new Prisma.Decimal(amount.toString()).mul(sign);

  if ((type === "INCOME" || isIncomingDebt(type)) && toAccountId) {
    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: dec } },
    });
  } else if ((type === "EXPENSE" || isOutgoingDebt(type)) && fromAccountId) {
    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: dec } },
    });
  } else if (type === "TRANSFER" && fromAccountId && toAccountId) {
    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: dec } },
    });
    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: dec } },
    });
  }
}

async function ensureAccountsBelong(userId: string, ids: (string | null | undefined)[]) {
  const filtered = ids.filter((v): v is string => Boolean(v));
  if (filtered.length === 0) return;
  const count = await prisma.account.count({
    where: { userId, id: { in: filtered } },
  });
  if (count !== new Set(filtered).size) {
    throw new Error("Выбранный счёт не принадлежит пользователю");
  }
}

async function ensureCategoryBelongs(
  type: TransactionType,
  userId: string,
  incomeCategoryId?: string | null,
  expenseCategoryId?: string | null,
) {
  if (type === "INCOME" && incomeCategoryId) {
    const c = await prisma.incomeCategory.findFirst({
      where: { id: incomeCategoryId, userId },
      select: { id: true },
    });
    if (!c) throw new Error("Категория дохода не найдена");
  }
  if (type === "EXPENSE" && expenseCategoryId) {
    const c = await prisma.expenseCategory.findFirst({
      where: { id: expenseCategoryId, userId },
      select: { id: true },
    });
    if (!c) throw new Error("Категория расхода не найдена");
  }
}

async function getOrCreateInterestCategoryId(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<string> {
  const existing = await tx.expenseCategory.findFirst({
    where: { userId, name: INTEREST_CATEGORY_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.expenseCategory.create({
    data: {
      userId,
      name: INTEREST_CATEGORY_NAME,
      icon: "📉",
      color: "#EF4444",
    },
    select: { id: true },
  });
  return created.id;
}

export async function createTransaction(input: CreateInput) {
  await ensureAccountsBelong(input.userId, [input.fromAccountId, input.toAccountId]);
  await ensureCategoryBelongs(
    input.type,
    input.userId,
    input.incomeCategoryId,
    input.expenseCategoryId,
  );

  return prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note,
        incomeCategoryId: input.type === "INCOME" ? input.incomeCategoryId ?? null : null,
        expenseCategoryId: input.type === "EXPENSE" ? input.expenseCategoryId ?? null : null,
        toAccountId:
          input.type === "INCOME" ||
          input.type === "TRANSFER" ||
          isIncomingDebt(input.type)
            ? input.toAccountId ?? null
            : null,
        fromAccountId:
          input.type === "EXPENSE" ||
          input.type === "TRANSFER" ||
          isOutgoingDebt(input.type)
            ? input.fromAccountId ?? null
            : null,
      },
    });

    await applyBalance(
      tx,
      created.type,
      created.amount,
      created.fromAccountId,
      created.toAccountId,
      1,
    );

    if (
      input.type === "DEBT_RETURN" &&
      input.interestAmount &&
      input.interestAmount > 0 &&
      input.fromAccountId
    ) {
      const categoryId = await getOrCreateInterestCategoryId(tx, input.userId);
      const interest = await tx.transaction.create({
        data: {
          userId: input.userId,
          type: "EXPENSE",
          amount: input.interestAmount,
          date: input.date,
          note: input.note ? `Проценты · ${input.note}` : "Проценты по долгу",
          expenseCategoryId: categoryId,
          fromAccountId: input.fromAccountId,
          parentId: created.id,
        },
      });
      await applyBalance(
        tx,
        "EXPENSE",
        interest.amount,
        interest.fromAccountId,
        null,
        1,
      );
    }

    return created;
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: CreateInput,
) {
  await ensureAccountsBelong(userId, [input.fromAccountId, input.toAccountId]);
  await ensureCategoryBelongs(
    input.type,
    userId,
    input.incomeCategoryId,
    input.expenseCategoryId,
  );

  return prisma.$transaction(async (tx) => {
    const old = await tx.transaction.findUnique({
      where: { id },
      include: { derived: true },
    });
    if (!old || old.userId !== userId) throw new Error("Операция не найдена");

    await applyBalance(tx, old.type, old.amount, old.fromAccountId, old.toAccountId, -1);

    const updated = await tx.transaction.update({
      where: { id },
      data: {
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note,
        incomeCategoryId: input.type === "INCOME" ? input.incomeCategoryId ?? null : null,
        expenseCategoryId: input.type === "EXPENSE" ? input.expenseCategoryId ?? null : null,
        toAccountId:
          input.type === "INCOME" ||
          input.type === "TRANSFER" ||
          isIncomingDebt(input.type)
            ? input.toAccountId ?? null
            : null,
        fromAccountId:
          input.type === "EXPENSE" ||
          input.type === "TRANSFER" ||
          isOutgoingDebt(input.type)
            ? input.fromAccountId ?? null
            : null,
      },
    });

    await applyBalance(
      tx,
      updated.type,
      updated.amount,
      updated.fromAccountId,
      updated.toAccountId,
      1,
    );

    // Синхронизация процентов: только когда редактируем DEBT_RETURN
    if (updated.type === "DEBT_RETURN") {
      const desired =
        input.interestAmount && input.interestAmount > 0 ? input.interestAmount : 0;
      const child = old.derived.find((d) => d.type === "EXPENSE") ?? null;

      if (desired === 0 && child) {
        await applyBalance(
          tx,
          child.type,
          child.amount,
          child.fromAccountId,
          child.toAccountId,
          -1,
        );
        await tx.transaction.delete({ where: { id: child.id } });
      } else if (desired > 0) {
        const categoryId =
          child?.expenseCategoryId ??
          (await getOrCreateInterestCategoryId(tx, userId));
        if (child) {
          await applyBalance(
            tx,
            child.type,
            child.amount,
            child.fromAccountId,
            child.toAccountId,
            -1,
          );
          const newChild = await tx.transaction.update({
            where: { id: child.id },
            data: {
              amount: desired,
              date: updated.date,
              note: updated.note ? `Проценты · ${updated.note}` : "Проценты по долгу",
              expenseCategoryId: categoryId,
              fromAccountId: updated.fromAccountId,
            },
          });
          await applyBalance(
            tx,
            newChild.type,
            newChild.amount,
            newChild.fromAccountId,
            null,
            1,
          );
        } else if (updated.fromAccountId) {
          const newChild = await tx.transaction.create({
            data: {
              userId,
              type: "EXPENSE",
              amount: desired,
              date: updated.date,
              note: updated.note ? `Проценты · ${updated.note}` : "Проценты по долгу",
              expenseCategoryId: categoryId,
              fromAccountId: updated.fromAccountId,
              parentId: updated.id,
            },
          });
          await applyBalance(
            tx,
            newChild.type,
            newChild.amount,
            newChild.fromAccountId,
            null,
            1,
          );
        }
      }
    } else if (old.type === "DEBT_RETURN" && old.derived.length > 0) {
      // Тип сменили — снимаем все производные
      for (const child of old.derived) {
        await applyBalance(
          tx,
          child.type,
          child.amount,
          child.fromAccountId,
          child.toAccountId,
          -1,
        );
      }
      await tx.transaction.deleteMany({
        where: { parentId: updated.id },
      });
    }

    return updated;
  });
}

export async function deleteTransaction(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.transaction.findUnique({
      where: { id },
      include: { derived: true },
    });
    if (!old || old.userId !== userId) throw new Error("Операция не найдена");

    await applyBalance(tx, old.type, old.amount, old.fromAccountId, old.toAccountId, -1);

    for (const child of old.derived) {
      await applyBalance(
        tx,
        child.type,
        child.amount,
        child.fromAccountId,
        child.toAccountId,
        -1,
      );
    }

    await tx.transaction.delete({ where: { id } });
    return { ok: true };
  });
}
