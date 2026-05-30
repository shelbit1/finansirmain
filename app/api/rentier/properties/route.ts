import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import {
  propertySchema,
  propertyStatusSchema,
  propertyTypeSchema,
} from "@/lib/rentierValidators";
import { createProperty } from "@/lib/rentierRepo";

export async function GET(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const where: Prisma.RentierPropertyWhereInput = { userId: auth.userId };

  const statusRaw = url.searchParams.get("status");
  if (statusRaw) {
    const parsed = propertyStatusSchema.safeParse(statusRaw);
    if (parsed.success) where.status = parsed.data;
  }

  const typeRaw = url.searchParams.get("type");
  if (typeRaw) {
    const parsed = propertyTypeSchema.safeParse(typeRaw);
    if (parsed.success) where.type = parsed.data;
  }

  const properties = await prisma.rentierProperty.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
      _count: { select: { tenants: true } },
    },
  });

  return NextResponse.json({ properties });
}

export async function POST(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = propertySchema.parse(body);
    const property = await createProperty(auth.userId, data);
    return NextResponse.json({ property }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
