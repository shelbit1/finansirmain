import Link from "next/link";
import { Layers, MapPin, Ruler, Train, Users } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import {
  PROPERTY_STATUS_LABELS,
  type SerializedProperty,
} from "@/lib/rentier";
import { PropertyTypeBadge } from "./PropertyTypeBadge";
import { YieldBadge } from "./YieldBadge";

function fmtDash(value: number | null, formatter: (v: number) => string): string {
  return value === null ? "—" : formatter(value);
}

export function PropertyCard({ property }: { property: SerializedProperty }) {
  const status = PROPERTY_STATUS_LABELS[property.status];
  const location =
    [property.city, property.district, property.address]
      .filter(Boolean)
      .join(", ") || "Адрес не указан";

  const floorLabel = property.floor
    ? `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ""} эт.`
    : null;

  return (
    <Link
      href={`/rentier/properties/${property.id}`}
      className="card block hover:border-primary/30 transition-colors group"
    >
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <PropertyTypeBadge type={property.type} showLabel />
          </div>
          <h3 className="font-display text-base font-semibold leading-snug truncate group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <p className="text-xs text-text-muted truncate mt-0.5">
            <MapPin className="w-3 h-3 inline -mt-px mr-0.5 opacity-70" />
            {location}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className="px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted border-b border-border bg-bg/30">
        <span className="inline-flex items-center gap-1">
          <Ruler className="w-3 h-3 opacity-70" />
          {property.area ? `${property.area} м²` : "—"}
        </span>
        {floorLabel && (
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3 h-3 opacity-70" />
            {floorLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Train className="w-3 h-3 opacity-70" />
          {property.metroWalk ? `${property.metroWalk} мин` : "—"}
        </span>
        {property.hasTenants && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3 opacity-70" />
            {property.tenants.length} аренд.
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 divide-x divide-border text-center">
        <MetricCell
          label="Цена"
          value={fmtDash(property.ownPrice ?? property.askPrice, (v) =>
            formatMoney(v, "RUB"),
          )}
        />
        <MetricCell
          label="Аренда"
          value={fmtDash(property.rentMonth, (v) => `${formatMoney(v, "RUB")}`)}
          sub="/мес"
        />
        <div className="px-2 py-2.5 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">
            Доходность
          </div>
          <div className="flex justify-center">
            <YieldBadge value={property.netYield} className="text-xs" />
          </div>
        </div>
        <MetricCell
          label="Окупаемость"
          value={fmtDash(property.paybackYears, (v) => `${v} лет`)}
        />
      </div>
    </Link>
  );
}

function MetricCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-2 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5 truncate">
        {label}
      </div>
      <div className="font-display font-semibold text-xs tnum truncate">
        {value}
        {sub && value !== "—" && (
          <span className="text-text-muted font-normal"> {sub}</span>
        )}
      </div>
    </div>
  );
}
