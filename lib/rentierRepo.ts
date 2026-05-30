import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calcYields } from "@/lib/rentier";
import type { PropertyInput, TenantInput } from "@/lib/rentierValidators";

function dec(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return new Prisma.Decimal(value);
}

/** Преобразует валидированный ввод в data-объект для Prisma create/update. */
function basePropertyData(input: PropertyInput) {
  return {
    type: input.type,
    status: input.status,
    title: input.title,
    notes: input.notes ?? null,

    address: input.address ?? null,
    city: input.city ?? null,
    district: input.district ?? null,
    metro: input.metro ?? null,
    metroWalk: input.metroWalk ?? null,
    floor: input.floor ?? null,
    totalFloors: input.totalFloors ?? null,
    yearBuilt: input.yearBuilt ?? null,

    area: dec(input.area),
    ceilingH: dec(input.ceilingH),
    entrance: input.entrance ?? null,
    condition: input.condition ?? null,

    askPrice: dec(input.askPrice),
    ownPrice: dec(input.ownPrice),
    pricePerSqm: dec(input.pricePerSqm),
    rentMonth: dec(input.rentMonth),
    rentPerSqm: dec(input.rentPerSqm),
    rentIndexPct: dec(input.rentIndexPct),
    communal: dec(input.communal),
    communalPaidBy: input.communalPaidBy ?? null,
    tax: dec(input.tax),
    management: dec(input.management),
    otherCosts: dec(input.otherCosts),

    hasTenants: input.hasTenants,
    tenantPlan: input.tenantPlan ?? null,
    vacancyMonths: input.vacancyMonths ?? null,

    sourceUrl: input.sourceUrl ?? null,
  };
}

function computeAndApplyYields(input: PropertyInput) {
  const yields = calcYields({
    askPrice: input.askPrice,
    ownPrice: input.ownPrice,
    rentMonth: input.rentMonth,
    communal: input.communal,
    tax: input.tax,
    management: input.management,
    otherCosts: input.otherCosts,
    area: input.area,
  });
  return {
    grossYield: dec(yields.grossYield),
    netYield: dec(yields.netYield),
    paybackYears: dec(yields.paybackYears),
    pricePerSqm: input.pricePerSqm != null ? dec(input.pricePerSqm) : dec(yields.pricePerSqm),
  };
}

function tenantData(t: TenantInput) {
  return {
    name: t.name,
    category: t.category ?? null,
    area: dec(t.area ?? null),
    rentMonth: dec(t.rentMonth ?? null),
    leaseStart: t.leaseStart ?? null,
    leaseEnd: t.leaseEnd ?? null,
    deposit: dec(t.deposit ?? null),
    notes: t.notes ?? null,
  };
}

export async function createProperty(userId: string, input: PropertyInput) {
  const base = basePropertyData(input);
  const yields = computeAndApplyYields(input);
  const tenants = input.hasTenants ? (input.tenants ?? []) : [];

  return prisma.rentierProperty.create({
    data: {
      ...base,
      ...yields,
      userId,
      hasTenants: tenants.length > 0 ? true : input.hasTenants,
      tenants: {
        create: tenants.map(tenantData),
      },
    },
    include: { tenants: true },
  });
}

export async function updateProperty(
  userId: string,
  id: string,
  input: PropertyInput,
) {
  const existing = await prisma.rentierProperty.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;

  const base = basePropertyData(input);
  const yields = computeAndApplyYields(input);

  // Полная замена арендаторов: проще и понятнее, чем дифф по id.
  const tenants = input.hasTenants ? (input.tenants ?? []) : [];

  return prisma.$transaction(async (tx) => {
    await tx.rentierTenant.deleteMany({ where: { propertyId: id } });
    return tx.rentierProperty.update({
      where: { id },
      data: {
        ...base,
        ...yields,
        hasTenants: tenants.length > 0 ? true : input.hasTenants,
        tenants: {
          create: tenants.map(tenantData),
        },
      },
      include: { tenants: true },
    });
  });
}

export async function syncHasTenants(propertyId: string) {
  const count = await prisma.rentierTenant.count({ where: { propertyId } });
  await prisma.rentierProperty.update({
    where: { id: propertyId },
    data: { hasTenants: count > 0 },
  });
}
