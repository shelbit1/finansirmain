import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PropertyCard } from "@/components/app/rentier/PropertyCard";
import { PropertiesFilters } from "@/components/app/rentier/PropertiesFilters";
import {
  serializeProperty,
} from "@/lib/rentier";
import {
  propertyStatusSchema,
  propertyTypeSchema,
} from "@/lib/rentierValidators";

type Search = { status?: string; type?: string };

export default async function PropertiesListPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const userId = await requireActiveSubscription();
  const sp = await searchParams;

  const where: Prisma.RentierPropertyWhereInput = { userId };
  const statusParsed = sp.status ? propertyStatusSchema.safeParse(sp.status) : null;
  if (statusParsed?.success) where.status = statusParsed.data;
  const typeParsed = sp.type ? propertyTypeSchema.safeParse(sp.type) : null;
  if (typeParsed?.success) where.type = typeParsed.data;

  const properties = await prisma.rentierProperty.findMany({
    where,
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const active = { status: sp.status, type: sp.type };

  return (
    <>
      <PageHeader
        title="Объекты"
        subtitle={`Найдено: ${properties.length}`}
        action={
          <Link href="/rentier/properties/new" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Добавить
          </Link>
        }
      />

      <PropertiesFilters status={active.status} type={active.type} />

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Объектов нет"
          description="По выбранным фильтрам ничего не найдено."
          action={
            <Link href="/rentier/properties/new" className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Добавить объект
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={serializeProperty(p)} />
          ))}
        </div>
      )}
    </>
  );
}
