import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { tenantSchema } from "@/lib/rentierValidators";
import { syncHasTenants } from "@/lib/rentierRepo";

function dec(v: number | null | undefined): Prisma.Decimal | null {
  return v === null || v === undefined ? null : new Prisma.Decimal(v);
}

type Ctx = { params: Promise<{ id: string; tenantId: string }> };

async function loadOwnTenant(userId: string, id: string, tenantId: string) {
  const tenant = await prisma.rentierTenant.findUnique({
    where: { id: tenantId },
    include: { property: true },
  });
  if (!tenant || tenant.propertyId !== id) return null;
  if (tenant.property.userId !== userId) return null;
  return tenant;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id, tenantId } = await ctx.params;

  const existing = await loadOwnTenant(auth.userId, id, tenantId);
  if (!existing) return jsonError("Арендатор не найден", 404);

  try {
    const body = await readJson(req);
    const data = tenantSchema.partial().parse(body);

    const tenant = await prisma.rentierTenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        category: data.category ?? undefined,
        area: data.area === undefined ? undefined : dec(data.area ?? null),
        rentMonth:
          data.rentMonth === undefined ? undefined : dec(data.rentMonth ?? null),
        leaseStart: data.leaseStart === undefined ? undefined : data.leaseStart,
        leaseEnd: data.leaseEnd === undefined ? undefined : data.leaseEnd,
        deposit: data.deposit === undefined ? undefined : dec(data.deposit ?? null),
        notes: data.notes ?? undefined,
      },
    });

    return NextResponse.json({ tenant });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id, tenantId } = await ctx.params;

  const existing = await loadOwnTenant(auth.userId, id, tenantId);
  if (!existing) return jsonError("Арендатор не найден", 404);

  await prisma.rentierTenant.delete({ where: { id: tenantId } });
  await syncHasTenants(id);
  return NextResponse.json({ ok: true });
}
