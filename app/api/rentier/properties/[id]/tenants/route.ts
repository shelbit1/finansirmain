import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { tenantSchema } from "@/lib/rentierValidators";
import { syncHasTenants } from "@/lib/rentierRepo";

function dec(v: number | null | undefined): Prisma.Decimal | null {
  return v === null || v === undefined ? null : new Prisma.Decimal(v);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  const property = await prisma.rentierProperty.findUnique({ where: { id } });
  if (!property || property.userId !== auth.userId) {
    return jsonError("Объект не найден", 404);
  }

  try {
    const body = await readJson(req);
    const data = tenantSchema.parse(body);

    const tenant = await prisma.rentierTenant.create({
      data: {
        propertyId: id,
        name: data.name,
        category: data.category ?? null,
        area: dec(data.area ?? null),
        rentMonth: dec(data.rentMonth ?? null),
        leaseStart: data.leaseStart ?? null,
        leaseEnd: data.leaseEnd ?? null,
        deposit: dec(data.deposit ?? null),
        notes: data.notes ?? null,
      },
    });

    await syncHasTenants(id);
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
