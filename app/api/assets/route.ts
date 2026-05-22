import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { assetSchema, assetTypeSchema } from "@/lib/validators";
import { createAssetWithHistory } from "@/lib/assetRepo";

export async function GET(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const where: Prisma.AssetWhereInput = { userId: auth.userId };
  if (type) {
    const parsed = assetTypeSchema.safeParse(type);
    if (parsed.success) where.type = parsed.data;
  }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { valueHistory: { orderBy: { date: "desc" }, take: 1 } },
  });
  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = assetSchema.parse(body);
    const asset = await createAssetWithHistory(auth.userId, {
      name: data.name,
      type: data.type,
      purchasePrice: data.purchasePrice,
      currentValue: data.currentValue,
      currency: data.currency,
      purchaseDate: data.purchaseDate,
      quantity: data.quantity,
      unit: data.unit,
      description: data.description,
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
