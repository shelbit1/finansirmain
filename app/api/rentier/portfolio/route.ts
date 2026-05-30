import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden } from "@/lib/api";
import type {
  RentierProperty,
  RentierPropertyStatus,
  RentierPropertyType,
  Prisma,
} from "@prisma/client";

type PropertyWithCounts = RentierProperty & { _count: { tenants: number } };

function toNum(v: Prisma.Decimal | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

function aggregate(properties: PropertyWithCounts[]) {
  const byStatus: Record<RentierPropertyStatus, number> = {
    WATCHING: 0,
    NEGOTIATING: 0,
    OWNED: 0,
    REJECTED: 0,
  };
  const byType: Record<RentierPropertyType, number> = {
    FREE_PURPOSE: 0,
    STREET_RETAIL: 0,
    SHOPPING_CENTER: 0,
    LAND: 0,
    PARKING: 0,
    WAREHOUSE: 0,
    STORAGE: 0,
  };

  let totalInvested = 0;
  let totalRentMonth = 0;
  let tenantsCount = 0;

  const yieldsSamples: { gross: number[]; net: number[] } = { gross: [], net: [] };

  for (const p of properties) {
    byStatus[p.status] += 1;
    byType[p.type] += 1;
    tenantsCount += p._count.tenants;

    if (p.status === "OWNED") {
      const own = toNum(p.ownPrice);
      if (own) totalInvested += own;
      const rent = toNum(p.rentMonth);
      if (rent) totalRentMonth += rent;
    }

    const gross = toNum(p.grossYield);
    if (gross !== null) yieldsSamples.gross.push(gross);
    const net = toNum(p.netYield);
    if (net !== null) yieldsSamples.net.push(net);
  }

  const avg = (arr: number[]) =>
    arr.length === 0
      ? null
      : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

  return {
    totalProperties: properties.length,
    byStatus,
    byType,
    totalInvested: Math.round(totalInvested),
    totalRentMonth: Math.round(totalRentMonth),
    avgGrossYield: avg(yieldsSamples.gross),
    avgNetYield: avg(yieldsSamples.net),
    tenantsCount,
  };
}

export async function GET() {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  const properties = await prisma.rentierProperty.findMany({
    where: { userId: auth.userId },
    include: { _count: { select: { tenants: true } } },
  });

  return NextResponse.json({ summary: aggregate(properties) });
}
