import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PortfolioSummary } from "@/components/app/rentier/PortfolioSummary";
import { PropertyCard } from "@/components/app/rentier/PropertyCard";
import { serializeProperty } from "@/lib/rentier";
import type {
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";

const STATUS_KEYS: RentierPropertyStatus[] = [
  "WATCHING",
  "NEGOTIATING",
  "OWNED",
  "REJECTED",
];
const TYPE_KEYS: RentierPropertyType[] = [
  "FREE_PURPOSE",
  "STREET_RETAIL",
  "SHOPPING_CENTER",
  "LAND",
  "PARKING",
  "WAREHOUSE",
  "STORAGE",
];

function dec(v: { toString(): string } | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

export default async function RentierDashboardPage() {
  const userId = await requireActiveSubscription();

  const properties = await prisma.rentierProperty.findMany({
    where: { userId },
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
      _count: { select: { tenants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = Object.fromEntries(
    STATUS_KEYS.map((k) => [k, 0]),
  ) as Record<RentierPropertyStatus, number>;
  const byType = Object.fromEntries(
    TYPE_KEYS.map((k) => [k, 0]),
  ) as Record<RentierPropertyType, number>;

  let totalInvested = 0;
  let totalRentMonth = 0;
  let tenantsCount = 0;
  const grossYields: number[] = [];
  const netYields: number[] = [];

  for (const p of properties) {
    byStatus[p.status] += 1;
    byType[p.type] += 1;
    tenantsCount += p._count.tenants;
    if (p.status === "OWNED") {
      const own = dec(p.ownPrice);
      if (own) totalInvested += own;
      const rent = dec(p.rentMonth);
      if (rent) totalRentMonth += rent;
    }
    const g = dec(p.grossYield);
    if (g !== null) grossYields.push(g);
    const n = dec(p.netYield);
    if (n !== null) netYields.push(n);
  }

  const avg = (arr: number[]) =>
    arr.length === 0
      ? null
      : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

  const summary = {
    totalProperties: properties.length,
    byStatus,
    byType,
    totalInvested: Math.round(totalInvested),
    totalRentMonth: Math.round(totalRentMonth),
    avgGrossYield: avg(grossYields),
    avgNetYield: avg(netYields),
    tenantsCount,
  };

  const recent = properties.slice(0, 3).map(serializeProperty);

  return (
    <>
      <PageHeader
        title="Рантье"
        subtitle="Анализ и учёт коммерческой недвижимости"
        action={
          <Link href="/rentier/properties/new" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Добавить объект
          </Link>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Пока ни одного объекта"
          description="Добавь объект коммерческой недвижимости — заведи карточку, занеси экономику, проверь доходность и сразу спроси ИИ оценку."
          action={
            <Link href="/rentier/properties/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Добавить первый объект
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <PortfolioSummary data={summary} />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Последние объекты
              </h2>
              <Link
                href="/rentier/properties"
                className="text-sm text-primary hover:underline"
              >
                Все объекты →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recent.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
