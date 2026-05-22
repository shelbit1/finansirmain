import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";
import { deleteTransaction, updateTransaction } from "@/lib/transactionRepo";
import { prisma } from "@/lib/db";
import {
  describeSubscription,
  ensureTrialSubscription,
} from "@/lib/billing";
import { getAccessTier, hasPaidAccess, isPaidTxType } from "@/lib/access";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = await readJson(req);
    const data = transactionSchema.parse(body);

    if (isPaidTxType(data.type)) {
      let sub = await prisma.subscription.findUnique({
        where: { userId: auth.userId },
      });
      if (!sub) sub = await ensureTrialSubscription(auth.userId);
      if (!hasPaidAccess(getAccessTier(describeSubscription(sub)))) {
        return jsonError(
          "Операции по долгам и активам доступны только в платной подписке.",
          402,
        );
      }
    }

    const tx = await updateTransaction(auth.userId, id, {
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
      personName: data.personName,
      debtId: data.debtId,
      assetData: data.assetData,
    });
    return NextResponse.json({ transaction: tx });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    await deleteTransaction(auth.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
