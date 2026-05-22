import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { debtSchema } from "@/lib/validators";
import { recalcDebt } from "@/lib/debtRepo";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.debt.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) return jsonError("Долг не найден", 404);

  try {
    const body = await readJson(req);
    const data = debtSchema.partial().parse(body);

    const result = await prisma.$transaction(async (tx) => {
      await tx.debt.update({
        where: { id },
        data: {
          direction: data.direction,
          personName: data.personName,
          amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
          currency: data.currency,
          dueDate: data.dueDate ?? undefined,
          description: data.description,
        },
      });
      return recalcDebt(tx, id);
    });

    return NextResponse.json({ debt: result });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.debt.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) return jsonError("Долг не найден", 404);

  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
