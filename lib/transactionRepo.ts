import "server-only";
import { Prisma, type AssetType, type TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recalcDebt, syncDebtFromTransactions } from "@/lib/debtRepo";

type AssetData = {
  name: string;
  type: AssetType;
  currency: string;
};

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
  personName?: string | null;
  debtId?: string | null;
  assetData?: AssetData | null;
};

const INTEREST_CATEGORY_NAME = "Проценты по долгу";

function isIncomingDebt(type: TransactionType): boolean {
  return type === "DEBT_TAKE" || type === "DEBT_RECEIVE";
}

function isOutgoingDebt(type: TransactionType): boolean {
  return type === "DEBT_RETURN" || type === "DEBT_GIVE";
}

function isDebtType(type: TransactionType): boolean {
  return isIncomingDebt(type) || isOutgoingDebt(type);
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
  } else if (
    (type === "EXPENSE" || isOutgoingDebt(type) || type === "ASSET_BUY") &&
    fromAccountId
  ) {
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

/**
 * Возвращает Debt для операции DEBT_TAKE/DEBT_GIVE:
 *   • если уже есть активный долг с тем же направлением, валютой и именем
 *     (без учёта регистра/пробелов по краям) — увеличиваем `amount`;
 *   • иначе создаём новый Debt.
 *
 * За счёт этого повторные займы у того же человека не дублируются, а
 * суммируются в одной записи раздела «Долги».
 */
async function getOrCreateDebtForOperation(
  tx: Prisma.TransactionClient,
  userId: string,
  type: TransactionType,
  amount: number,
  personName: string,
  dueDate: Date | null,
  description: string | null,
) {
  const direction = type === "DEBT_TAKE" ? "I_OWE" : "OWED_TO_ME";
  const currency = "RUB";
  const trimmed = personName.trim();

  const existing = await tx.debt.findFirst({
    where: {
      userId,
      direction,
      currency,
      status: { not: "CLOSED" },
      personName: { equals: trimmed, mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return tx.debt.update({
      where: { id: existing.id },
      data: {
        amount: new Prisma.Decimal(existing.amount.toString()).add(amount),
      },
    });
  }

  return tx.debt.create({
    data: {
      userId,
      direction,
      personName: trimmed,
      amount,
      currency,
      paidAmount: 0,
      status: "ACTIVE",
      dueDate: dueDate ?? null,
      description: description ?? null,
    },
  });
}

/** Создаёт DebtPayment для DEBT_RETURN/DEBT_RECEIVE с проверкой суммы. */
async function createPaymentForOperation(
  tx: Prisma.TransactionClient,
  userId: string,
  type: TransactionType,
  debtId: string,
  amount: number,
  date: Date,
  note: string | null,
) {
  const expectedDirection = type === "DEBT_RETURN" ? "I_OWE" : "OWED_TO_ME";
  const debt = await tx.debt.findFirst({
    where: { id: debtId, userId },
    include: { payments: true },
  });
  if (!debt) throw new Error("Долг не найден");
  if (debt.direction !== expectedDirection) {
    throw new Error(
      type === "DEBT_RETURN"
        ? "Выбран долг, который не вы должны"
        : "Выбран долг, который вы должны кому-то",
    );
  }

  const paid = debt.payments.reduce(
    (acc, p) => acc.add(p.amount),
    new Prisma.Decimal(0),
  );
  const newPaid = paid.add(amount);
  if (newPaid.greaterThan(debt.amount)) {
    throw new Error("Сумма возврата превышает остаток долга");
  }

  return tx.debtPayment.create({
    data: { debtId, amount, date, note: note ?? undefined },
  });
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
    let debtId: string | null = null;
    let debtPaymentId: string | null = null;
    let assetId: string | null = null;

    if (input.type === "ASSET_BUY") {
      if (!input.fromAccountId) throw new Error("Выберите счёт списания");
      if (!input.assetData) throw new Error("Заполните данные актива");
      const asset = await tx.asset.create({
        data: {
          userId: input.userId,
          name: input.assetData.name,
          type: input.assetData.type,
          purchasePrice: input.amount,
          currentValue: input.amount,
          currency: input.assetData.currency,
          purchaseDate: input.date,
        },
      });
      await tx.assetValueHistory.create({
        data: {
          assetId: asset.id,
          userId: input.userId,
          value: input.amount,
          date: input.date,
          note: "Покупка",
        },
      });
      assetId = asset.id;
    } else if (input.type === "DEBT_TAKE" || input.type === "DEBT_GIVE") {
      if (!input.personName) throw new Error("Введите имя человека");
      const debt = await getOrCreateDebtForOperation(
        tx,
        input.userId,
        input.type,
        input.amount,
        input.personName,
        null,
        input.note ?? null,
      );
      debtId = debt.id;
    } else if (input.type === "DEBT_RETURN" || input.type === "DEBT_RECEIVE") {
      if (!input.debtId) throw new Error("Выберите долг");
      const payment = await createPaymentForOperation(
        tx,
        input.userId,
        input.type,
        input.debtId,
        input.amount,
        input.date,
        input.note ?? null,
      );
      debtId = input.debtId;
      debtPaymentId = payment.id;
    }

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
          isOutgoingDebt(input.type) ||
          input.type === "ASSET_BUY"
            ? input.fromAccountId ?? null
            : null,
        debtId,
        debtPaymentId,
        assetId,
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
      await applyBalance(tx, "EXPENSE", interest.amount, interest.fromAccountId, null, 1);
    }

    if (debtId) {
      await recalcDebt(tx, debtId);
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
      include: { derived: true, debt: { include: { payments: true } } },
    });
    if (!old || old.userId !== userId) throw new Error("Операция не найдена");

    // Запрещаем смену типа между долговым и недолговым
    if (isDebtType(old.type) !== isDebtType(input.type)) {
      throw new Error(
        "Нельзя сменить тип на другой класс операций — удалите и создайте заново",
      );
    }
    // Запрещаем смену конкретного подтипа долга (направление меняет связку с Debt)
    if (isDebtType(old.type) && old.type !== input.type) {
      throw new Error(
        "Нельзя сменить тип долговой операции — удалите и создайте заново",
      );
    }
    // Запрещаем смену типа покупки актива на другой и наоборот
    if ((old.type === "ASSET_BUY") !== (input.type === "ASSET_BUY")) {
      throw new Error(
        "Нельзя сменить тип на другой класс операций — удалите и создайте заново",
      );
    }

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
          isOutgoingDebt(input.type) ||
          input.type === "ASSET_BUY"
            ? input.fromAccountId ?? null
            : null,
      },
    });

    // Синхронизация связанного актива при изменении суммы/даты ASSET_BUY
    if (updated.type === "ASSET_BUY" && old.assetId) {
      await tx.asset.update({
        where: { id: old.assetId },
        data: {
          purchasePrice: updated.amount,
          purchaseDate: updated.date,
        },
      });
      const firstValue = await tx.assetValueHistory.findFirst({
        where: { assetId: old.assetId },
        orderBy: { date: "asc" },
      });
      if (firstValue) {
        await tx.assetValueHistory.update({
          where: { id: firstValue.id },
          data: { value: updated.amount, date: updated.date },
        });
      }
    }

    await applyBalance(
      tx,
      updated.type,
      updated.amount,
      updated.fromAccountId,
      updated.toAccountId,
      1,
    );

    // Синхронизация Debt/DebtPayment
    if (updated.type === "DEBT_TAKE" || updated.type === "DEBT_GIVE") {
      if (!old.debtId) throw new Error("Связанный долг не найден");
      const debt = await tx.debt.findUnique({
        where: { id: old.debtId },
        include: { payments: true },
      });
      if (!debt) throw new Error("Связанный долг не найден");

      // Пересчёт суммы долга по всем связанным операциям-источникам,
      // чтобы поддержать сценарий «несколько операций → один долг».
      const sources = await tx.transaction.findMany({
        where: { debtId: old.debtId, type: { in: ["DEBT_TAKE", "DEBT_GIVE"] } },
        select: { amount: true },
      });
      const totalAmount = sources.reduce(
        (acc, t) => acc.add(t.amount),
        new Prisma.Decimal(0),
      );

      const paidSum = debt.payments.reduce(
        (acc, p) => acc.add(p.amount),
        new Prisma.Decimal(0),
      );
      if (paidSum.greaterThan(totalAmount)) {
        throw new Error(
          "Сумма долга меньше уже учтённых возвратов — сначала удалите возвраты",
        );
      }
      await tx.debt.update({
        where: { id: old.debtId },
        data: {
          amount: totalAmount,
          personName: input.personName ?? debt.personName,
        },
      });
      await recalcDebt(tx, old.debtId);
    } else if (updated.type === "DEBT_RETURN" || updated.type === "DEBT_RECEIVE") {
      if (!old.debtPaymentId || !old.debtId) {
        throw new Error("Связанный платёж не найден");
      }
      await tx.debtPayment.update({
        where: { id: old.debtPaymentId },
        data: {
          amount: updated.amount,
          date: updated.date,
          note: updated.note ?? null,
        },
      });
      // Проверим, что после изменения сумма выплат не превышает amount
      const debt = await tx.debt.findUnique({
        where: { id: old.debtId },
        include: { payments: true },
      });
      if (debt) {
        const paid = debt.payments.reduce(
          (acc, p) => acc.add(p.amount),
          new Prisma.Decimal(0),
        );
        if (paid.greaterThan(debt.amount)) {
          throw new Error("Сумма возвратов превышает тело долга");
        }
      }
      await recalcDebt(tx, old.debtId);
    }

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
    }

    return updated;
  });
}

export async function deleteTransaction(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.transaction.findUnique({
      where: { id },
      include: { derived: true, debt: { include: { payments: true } } },
    });
    if (!old || old.userId !== userId) throw new Error("Операция не найдена");

    // Откат балансов
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

    // DEBT_TAKE / DEBT_GIVE — операция-источник долга.
    // Если у долга несколько источников (несколько TAKE/GIVE от одного лица
    // объединены в одну запись), удаляется только текущая операция, а сумма
    // долга пересчитывается по остальным.
    if (
      (old.type === "DEBT_TAKE" || old.type === "DEBT_GIVE") &&
      old.debtId &&
      old.debt
    ) {
      const sourcesCount = await tx.transaction.count({
        where: {
          debtId: old.debtId,
          type: { in: ["DEBT_TAKE", "DEBT_GIVE"] },
        },
      });
      const isLastSource = sourcesCount <= 1;

      if (isLastSource && old.debt.payments.length > 0) {
        throw new Error(
          "Нельзя удалить операцию: у этого долга есть возвраты. Сначала удалите их.",
        );
      }

      await tx.transaction.delete({ where: { id } });

      if (isLastSource) {
        await tx.debt.delete({ where: { id: old.debtId } });
      } else {
        // Проверяем, что после удаления оставшейся суммы хватит на учтённые
        // возвраты. Если нет — откатываем удаление через throw.
        const remaining = await tx.transaction.aggregate({
          where: {
            debtId: old.debtId,
            type: { in: ["DEBT_TAKE", "DEBT_GIVE"] },
          },
          _sum: { amount: true },
        });
        const remainingAmount = remaining._sum.amount ?? new Prisma.Decimal(0);
        const paidSum = old.debt.payments.reduce(
          (acc, p) => acc.add(p.amount),
          new Prisma.Decimal(0),
        );
        if (paidSum.greaterThan(remainingAmount)) {
          throw new Error(
            "Нельзя удалить: оставшаяся сумма долга станет меньше учтённых возвратов.",
          );
        }
        await syncDebtFromTransactions(tx, old.debtId);
      }
    } else {
      await tx.transaction.delete({ where: { id } });
    }

    // DEBT_RETURN/RECEIVE — удалить связанный платёж и пересчитать статус
    if (
      (old.type === "DEBT_RETURN" || old.type === "DEBT_RECEIVE") &&
      old.debtPaymentId &&
      old.debtId
    ) {
      await tx.debtPayment.delete({ where: { id: old.debtPaymentId } });
      await recalcDebt(tx, old.debtId);
    }

    // ASSET_BUY — удалить связанный актив (история стоимости каскадом)
    if (old.type === "ASSET_BUY" && old.assetId) {
      await tx.asset.delete({ where: { id: old.assetId } });
    }

    return { ok: true };
  });
}
