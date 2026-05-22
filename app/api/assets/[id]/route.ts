import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { assetSchema } from "@/lib/validators";
import { addAssetValue } from "@/lib/assetRepo";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
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

    // Если меняется текущая стоимость — добавляем запись в историю и обновляем актив.
    if (
      typeof data.currentValue === "number" &&
      data.currentValue !== decimalToNumber(existing.currentValue)
    ) {
      const updated = await addAssetValue(auth.userId, id, {
        value: data.currentValue,
        date: new Date(),
        note: "Корректировка",
      });
      return NextResponse.json({ asset: updated });
    }

    return NextResponse.json({ asset });
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

  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) return jsonError("Актив не найден", 404);

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
