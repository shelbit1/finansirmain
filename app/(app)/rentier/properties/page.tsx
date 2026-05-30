import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import type {
  Prisma,
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PropertyCard } from "@/components/app/rentier/PropertyCard";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  serializeProperty,
} from "@/lib/rentier";
import {
  propertyStatusSchema,
  propertyTypeSchema,
} from "@/lib/rentierValidators";

type Search = { status?: string; type?: string };

const STATUS_VALUES = Object.keys(
  PROPERTY_STATUS_LABELS,
) as RentierPropertyStatus[];
const TYPE_VALUES = Object.keys(PROPERTY_TYPE_LABELS) as RentierPropertyType[];

function buildHref(base: { status?: string; type?: string }, patch: Partial<Search>) {
  const params = new URLSearchParams();
  const status = patch.status !== undefined ? patch.status : base.status;
  const type = patch.type !== undefined ? patch.type : base.type;
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  const qs = params.toString();
  return `/rentier/properties${qs ? `?${qs}` : ""}`;
}

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

      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Статус:</span>
          <FilterChip href={buildHref(active, { status: undefined })} active={!active.status}>
            Все
          </FilterChip>
          {STATUS_VALUES.map((s) => (
            <FilterChip
              key={s}
              href={buildHref(active, { status: s })}
              active={active.status === s}
            >
              {PROPERTY_STATUS_LABELS[s].label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Тип:</span>
          <FilterChip href={buildHref(active, { type: undefined })} active={!active.type}>
            Все
          </FilterChip>
          {TYPE_VALUES.map((t) => (
            <FilterChip
              key={t}
              href={buildHref(active, { type: t })}
              active={active.type === t}
            >
              {PROPERTY_TYPE_LABELS[t].emoji} {PROPERTY_TYPE_LABELS[t].label}
            </FilterChip>
          ))}
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={serializeProperty(p)} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-bg text-text-muted hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}
