import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { assetSchema } from "@/lib/validators";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) return jsonError("Актив не найден", 404);

  try {
    const body = await readJson(req);
    const data = assetSchema.partial().parse(body);
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        purchasePrice: data.purchasePrice,
        currency: data.currency,
        purchaseDate: data.purchaseDate ?? undefined,
        quantity: data.quantity ?? undefined,
        unit: data.unit,
        description: data.description,
      },
    });
    return NextResponse.json({ asset });
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

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) return jsonError("Актив не найден", 404);

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
