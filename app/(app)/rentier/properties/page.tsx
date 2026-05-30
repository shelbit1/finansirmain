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
import { ScrollableTabs } from "@/components/ui/ScrollableTabs";
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
import { cn } from "@/lib/utils";

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

      <div className="card p-3 sm:p-4 mb-5 space-y-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2 block">
            Статус
          </span>
          <ScrollableTabs>
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
          </ScrollableTabs>
        </div>
        <div className="pt-3 border-t border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2 block">
            Тип
          </span>
          <ScrollableTabs>
            <FilterChip href={buildHref(active, { type: undefined })} active={!active.type}>
              Все
            </FilterChip>
            {TYPE_VALUES.map((t) => (
              <FilterChip
                key={t}
                href={buildHref(active, { type: t })}
                active={active.type === t}
              >
                <span className="font-semibold">{PROPERTY_TYPE_LABELS[t].abbr}</span>
                <span className="hidden sm:inline text-text-muted font-normal">
                  {" "}
                  · {PROPERTY_TYPE_LABELS[t].label}
                </span>
              </FilterChip>
            ))}
          </ScrollableTabs>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-surface shadow-sm text-text"
          : "text-text-muted hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}
