import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { transactionSchema, transactionTypeSchema } from "@/lib/validators";
import { createTransaction } from "@/lib/transactionRepo";

export async function GET(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const accountId = url.searchParams.get("accountId");
  const categoryId = url.searchParams.get("categoryId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const where: Prisma.TransactionWhereInput = { userId: auth.userId };
  if (type) {
    const parsed = transactionTypeSchema.safeParse(type);
    if (parsed.success) where.type = parsed.data;
  }
  if (accountId) {
    where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (categoryId) {
    where.OR = [
      ...(where.OR ?? []),
      { incomeCategoryId: categoryId },
      { expenseCategoryId: categoryId },
    ];
  }
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
      include: {
        incomeCategory: { select: { id: true, name: true, icon: true, color: true } },
        expenseCategory: { select: { id: true, name: true, icon: true, color: true } },
        fromAccount: { select: { id: true, name: true, icon: true, color: true, currency: true } },
        toAccount: { select: { id: true, name: true, icon: true, color: true, currency: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = transactionSchema.parse(body);
    const tx = await createTransaction({
      userId: auth.userId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      note: data.note,
      incomeCategoryId: data.incomeCategoryId,
      expenseCategoryId: data.expenseCategoryId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      interestAmount: data.interestAmount,
    });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
