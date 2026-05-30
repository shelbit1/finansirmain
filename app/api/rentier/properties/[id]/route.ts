import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { propertySchema } from "@/lib/rentierValidators";
import { updateProperty } from "@/lib/rentierRepo";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const property = await prisma.rentierProperty.findUnique({
    where: { id },
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
      images: { orderBy: { order: "asc" } },
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!property || property.userId !== auth.userId) {
    return jsonError("Объект не найден", 404);
  }

  return NextResponse.json({ property });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = await readJson(req);
    const data = propertySchema.parse(body);
    const property = await updateProperty(auth.userId, id, data);
    if (!property) return jsonError("Объект не найден", 404);
    return NextResponse.json({ property });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.rentierProperty.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return jsonError("Объект не найден", 404);
  }

  await prisma.rentierProperty.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
