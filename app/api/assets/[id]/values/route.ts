import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { assetValueSchema } from "@/lib/validators";
import { addAssetValue } from "@/lib/assetRepo";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || asset.userId !== auth.userId) return jsonError("Актив не найден", 404);

  const values = await prisma.assetValueHistory.findMany({
    where: { assetId: id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ values });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = await readJson(req);
    const data = assetValueSchema.parse(body);
    const asset = await addAssetValue(auth.userId, id, data);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
