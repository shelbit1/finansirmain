import Link from "next/link";
import { ChevronRight, MapPin, Ruler, Train, Users } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type SerializedProperty,
} from "@/lib/rentier";
import { YieldBadge } from "./YieldBadge";

function fmtDash(value: number | null, formatter: (v: number) => string): string {
  return value === null ? "—" : formatter(value);
}

export function PropertyCard({ property }: { property: SerializedProperty }) {
  const type = PROPERTY_TYPE_LABELS[property.type];
  const status = PROPERTY_STATUS_LABELS[property.status];
  const location =
    [property.city, property.district, property.address]
      .filter(Boolean)
      .join(", ") || "Адрес не указан";

  return (
    <Link
      href={`/rentier/properties/${property.id}`}
      className="card p-4 sm:p-5 block hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <span>{type.emoji}</span>
            <span>{type.label}</span>
          </div>
          <h3 className="font-display text-lg font-semibold leading-tight truncate">
            {property.title}
          </h3>
          <p className="text-sm text-text-muted truncate mt-0.5">
            <MapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            {location}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted mb-3">
        <span className="inline-flex items-center gap-1">
          <Ruler className="w-3.5 h-3.5" />
          {property.area ? `${property.area} кв.м` : "—"}
        </span>
        <span>
          🏢{" "}
          {property.floor
            ? `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ""} эт.`
            : "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Train className="w-3.5 h-3.5" />
          {property.metroWalk ? `${property.metroWalk} мин` : "—"}
        </span>
        {property.hasTenants && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {property.tenants.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-sm">
        <div>
          <div className="text-text-muted text-xs">Цена</div>
          <div className="font-display font-semibold tnum">
            {fmtDash(property.ownPrice ?? property.askPrice, (v) =>
              formatMoney(v, "RUB"),
            )}
          </div>
        </div>
        <div>
          <div className="text-text-muted text-xs">Аренда</div>
          <div className="font-display font-semibold tnum">
            {fmtDash(property.rentMonth, (v) => `${formatMoney(v, "RUB")} /мес`)}
          </div>
        </div>
        <div>
          <div className="text-text-muted text-xs">Чистая доходность</div>
          <YieldBadge value={property.netYield} />
        </div>
        <div>
          <div className="text-text-muted text-xs">Окупаемость</div>
          <div className="font-display font-semibold tnum">
            {fmtDash(property.paybackYears, (v) => `${v} лет`)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mt-3 text-sm text-primary font-medium gap-1 group-hover:gap-2 transition-all">
        Открыть <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
