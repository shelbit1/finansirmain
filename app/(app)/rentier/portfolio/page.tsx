import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import type {
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  PortfolioSummary,
  type PortfolioSummaryData,
} from "@/components/app/rentier/PortfolioSummary";
import { AIChat } from "@/components/app/rentier/AIChat";
import { PropertyTypeBadge } from "@/components/app/rentier/PropertyTypeBadge";
import {
  dec,
  serializeProperty,
} from "@/lib/rentier";
import { YieldBadge } from "@/components/app/rentier/YieldBadge";
import { formatMoney } from "@/lib/utils";

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

export default async function PortfolioPage() {
  const userId = await requireActiveSubscription();

  const properties = await prisma.rentierProperty.findMany({
    where: { userId },
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
      _count: { select: { tenants: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (properties.length === 0) {
    return (
      <>
        <PageHeader title="Портфель" subtitle="Сводка по всем объектам" />
        <EmptyState
          icon={Building2}
          title="Портфель пуст"
          description="Добавь хотя бы один объект, чтобы увидеть сводку и спросить ИИ оценку портфеля."
          action={
            <Link href="/rentier/properties/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Добавить объект
            </Link>
          }
        />
      </>
    );
  }

  const byStatus = Object.fromEntries(
    STATUS_KEYS.map((k) => [k, 0]),
  ) as Record<RentierPropertyStatus, number>;
  const byType = Object.fromEntries(
    TYPE_KEYS.map((k) => [k, 0]),
  ) as Record<RentierPropertyType, number>;
  let totalInvested = 0;
  let totalRentMonth = 0;
  let tenantsCount = 0;
  const gross: number[] = [];
  const net: number[] = [];

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
    if (g !== null) gross.push(g);
    const n = dec(p.netYield);
    if (n !== null) net.push(n);
  }

  const avg = (arr: number[]) =>
    arr.length === 0
      ? null
      : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

  const summary: PortfolioSummaryData = {
    totalProperties: properties.length,
    byStatus,
    byType,
    totalInvested: Math.round(totalInvested),
    totalRentMonth: Math.round(totalRentMonth),
    avgGrossYield: avg(gross),
    avgNetYield: avg(net),
    tenantsCount,
  };

  const top = properties
    .map(serializeProperty)
    .filter((p) => p.netYield !== null)
    .sort((a, b) => (b.netYield ?? 0) - (a.netYield ?? 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Портфель" subtitle="Сводка по всем объектам" />

      <div className="space-y-6">
        <PortfolioSummary data={summary} />

        {top.length > 0 && (
          <section className="card p-5">
            <h3 className="font-display text-base font-semibold mb-3">
              Топ по чистой доходности
            </h3>
            <div className="divide-y divide-border">
              {top.map((p) => (
                <Link
                  key={p.id}
                  href={`/rentier/properties/${p.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-bg rounded-md px-2 -mx-2"
                >
                  <PropertyTypeBadge type={p.type} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-text-muted truncate">
                      {p.city ?? p.address ?? "—"}
                      {p.ownPrice !== null
                        ? ` · ${formatMoney(p.ownPrice, "RUB")}`
                        : ""}
                    </div>
                  </div>
                  <YieldBadge value={p.netYield} className="shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <AIChat title="ИИ-анализ портфеля" />
      </div>
    </>
  );
}
