import Link from "next/link";
import { formatMoneyCompact } from "@/lib/utils";
import {
  PROPERTY_STATUS_LABELS,
  cardDisplayPrice,
  type SerializedProperty,
} from "@/lib/rentier";
import { PropertyTypeBadge } from "./PropertyTypeBadge";
import { YieldBadge } from "./YieldBadge";

function fmtDash(value: number | null, formatter: (v: number) => string): string {
  return value === null ? "—" : formatter(value);
}

export function PropertyCard({ property }: { property: SerializedProperty }) {
  const status = PROPERTY_STATUS_LABELS[property.status];
  const location = [property.city, property.district].filter(Boolean).join(", ");

  const floorLabel = property.floor
    ? `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ""} эт.`
    : null;

  const specs = [
    property.area ? `${property.area} м²` : null,
    floorLabel,
    property.metroWalk ? `${property.metroWalk} мин` : null,
    property.hasTenants ? `${property.tenants.length} аренд.` : null,
  ].filter(Boolean);

  const subtitle = [location, ...specs].filter(Boolean).join(" · ") || "—";

  return (
    <Link
      href={`/rentier/properties/${property.id}`}
      className="card block w-full max-w-xs hover:border-primary/30 transition-colors group"
    >
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <PropertyTypeBadge type={property.type} className="shrink-0" />
          <h3 className="font-display text-sm font-semibold leading-tight truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <span
            className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <p className="text-[11px] text-text-muted truncate mt-0.5">{subtitle}</p>
      </div>

      <div className="grid grid-cols-4 divide-x divide-border text-center">
        <MetricCell
          label="Цена"
          value={fmtDash(cardDisplayPrice(property), formatMoneyCompact)}
        />
        <MetricCell
          label="Аренда"
          value={fmtDash(property.rentMonth, formatMoneyCompact)}
          sub="/мес"
        />
        <div className="px-1.5 py-1.5 min-w-0">
          <div className="text-[9px] uppercase tracking-wide text-text-muted mb-0.5">
            Доходность
          </div>
          <div className="flex justify-center">
            <YieldBadge value={property.netYield} className="text-[11px] px-1.5 py-0" />
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
    <div className="px-1.5 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wide text-text-muted mb-0.5 truncate">
        {label}
      </div>
      <div className="font-display font-semibold text-[11px] tnum truncate leading-tight">
        {value}
        {sub && value !== "—" && (
          <span className="text-text-muted font-normal"> {sub}</span>
        )}
      </div>
    </div>
  );
}
