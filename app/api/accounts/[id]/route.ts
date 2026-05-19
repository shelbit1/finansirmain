import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { accountSchema } from "@/lib/validators";

async function ownAccount(userId: string, id: string) {
  const acc = await prisma.account.findUnique({ where: { id } });
  if (!acc || acc.userId !== userId) return null;
  return acc;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await ownAccount(auth.userId, id);
  if (!existing) return jsonError("Счёт не найден", 404);

  try {
    const body = await readJson(req);
    const data = accountSchema.partial().parse(body);
    const account = await prisma.account.update({ where: { id }, data });
    return NextResponse.json({ account });
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

  const existing = await ownAccount(auth.userId, id);
  if (!existing) return jsonError("Счёт не найден", 404);

  const txCount = await prisma.transaction.count({
    where: {
      userId: auth.userId,
      OR: [{ fromAccountId: id }, { toAccountId: id }],
    },
  });
  if (txCount > 0) {
    return jsonError(
      `Нельзя удалить счёт: к нему привязано ${txCount} операций. Сначала удалите или переназначьте операции.`,
      409,
    );
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
