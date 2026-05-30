import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, jsonError, readJson } from "@/lib/api";

const schema = z.object({
  notes: z.string().max(10000).nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.rentierProperty.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return jsonError("Объект не найден", 404);
  }

  try {
    const body = await readJson(req);
    const { notes } = schema.parse(body);
    const property = await prisma.rentierProperty.update({
      where: { id },
      data: { notes },
      select: { id: true, notes: true },
    });
    return NextResponse.json({ property });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
