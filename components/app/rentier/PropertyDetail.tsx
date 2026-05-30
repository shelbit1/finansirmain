import Link from "next/link";
import { Calendar, ExternalLink, MapPin, Pencil, Ruler, Train, Users } from "lucide-react";
import { PropertyNotes } from "./PropertyNotes";
import { PropertyTypeBadge } from "./PropertyTypeBadge";
import { formatMoney, isPlaceholderDate } from "@/lib/utils";
import {
  CONDITION_LABELS,
  ENTRANCE_LABELS,
  PROPERTY_STATUS_LABELS,
  type SerializedProperty,
} from "@/lib/rentier";
import { YieldBadge } from "./YieldBadge";

function fmtRub(value: number | null) {
  return value === null ? "—" : formatMoney(value, "RUB");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-1 gap-3 text-sm">
      <span className="text-text-muted text-xs">{label}</span>
      <span className="text-text font-medium text-right tnum text-sm">{value}</span>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso || isPlaceholderDate(iso)) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

export function PropertyDetail({ property }: { property: SerializedProperty }) {
  const status = PROPERTY_STATUS_LABELS[property.status];
  const location =
    [property.city, property.district, property.address]
      .filter(Boolean)
      .join(", ") || "Адрес не указан";
  const price = property.ownPrice ?? property.askPrice;

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted mb-1">
              <PropertyTypeBadge type={property.type} showLabel />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              {property.title}
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              {location}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/rentier/properties/${property.id}/edit`}
              className="btn btn-ghost"
            >
              <Pencil className="w-4 h-4" />
              Редактировать
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg bg-bg p-2.5">
            <div className="text-xs text-text-muted mb-0.5">Цена</div>
            <div className="font-display font-semibold tnum text-sm">
              {fmtRub(price)}
            </div>
          </div>
          <div className="rounded-lg bg-bg p-2.5">
            <div className="text-xs text-text-muted mb-0.5">Площадь</div>
            <div className="font-display font-semibold tnum text-sm">
              {property.area ? `${property.area} кв.м` : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-bg p-2.5">
            <div className="text-xs text-text-muted mb-0.5">Чистая доходность</div>
            <YieldBadge value={property.netYield} className="text-sm" />
          </div>
          <div className="rounded-lg bg-bg p-2.5">
            <div className="text-xs text-text-muted mb-0.5">Окупаемость</div>
            <div className="font-display font-semibold tnum text-sm">
              {property.paybackYears ? `${property.paybackYears} лет` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <section className="card p-4">
          <h3 className="font-display text-sm font-semibold mb-2">Экономика</h3>
          <Row label="Цена продавца" value={fmtRub(property.askPrice)} />
          <Row label="Своя оценка / покупка" value={fmtRub(property.ownPrice)} />
          <Row label="Цена за кв.м" value={fmtRub(property.pricePerSqm)} />
          <Row
            label="Аренда"
            value={
              property.rentMonth ? `${formatMoney(property.rentMonth)} /мес` : "—"
            }
          />
          <Row
            label="Аренда за кв.м"
            value={
              property.rentPerSqm
                ? `${formatMoney(property.rentPerSqm)} /кв.м`
                : "—"
            }
          />
          <Row
            label="Индексация"
            value={property.rentIndexPct !== null ? `${property.rentIndexPct}% /год` : "—"}
          />
          <Row
            label="Коммуналка"
            value={property.communal ? `${formatMoney(property.communal)} /мес` : "—"}
          />
          <Row
            label="Кто платит КУ"
            value={property.communalPaidBy ?? "—"}
          />
          <Row label="Налог" value={property.tax ? `${formatMoney(property.tax)} /год` : "—"} />
          <Row
            label="Управление"
            value={property.management ? `${formatMoney(property.management)} /мес` : "—"}
          />
          <Row
            label="Прочие расходы"
            value={property.otherCosts ? `${formatMoney(property.otherCosts)} /мес` : "—"}
          />
          <div className="border-t border-border mt-2 pt-2">
            <Row
              label="Валовая доходность"
              value={<YieldBadge value={property.grossYield} />}
            />
            <Row
              label="Чистая доходность"
              value={<YieldBadge value={property.netYield} />}
            />
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted" />
            <h3 className="font-display text-sm font-semibold">Арендаторы</h3>
          </div>
          {property.hasTenants && property.tenants.length > 0 ? (
            <div className="space-y-2">
              {property.tenants.map((t) => (
                <div key={t.id} className="rounded-lg bg-bg p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-sm">{t.name}</div>
                    {t.category && (
                      <span className="text-xs text-text-muted">{t.category}</span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {t.area && <span>{t.area} кв.м</span>}
                    {t.rentMonth && (
                      <span>{formatMoney(t.rentMonth)} /мес</span>
                    )}
                    {t.deposit && <span>депозит {formatMoney(t.deposit)}</span>}
                    {t.leaseEnd && !isPlaceholderDate(t.leaseEnd) && (
                      <span>
                        <Calendar className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                        до {fmtDate(t.leaseEnd)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted">
              {property.tenantPlan ? (
                <>
                  <div className="mb-1 font-medium text-text">Планы по объекту</div>
                  <p>{property.tenantPlan}</p>
                  {property.vacancyMonths !== null && (
                    <p className="mt-2 text-xs">
                      Вакантен: {property.vacancyMonths} мес.
                    </p>
                  )}
                </>
              ) : (
                "Информация об арендаторах не указана."
              )}
            </div>
          )}
        </section>

        <section className="card p-4">
          <h3 className="font-display text-sm font-semibold mb-2">Параметры</h3>
          <Row
            label="Этаж"
            value={
              property.floor
                ? `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ""}`
                : "—"
            }
          />
          <Row label="Год постройки" value={property.yearBuilt ?? "—"} />
          <Row
            label="Высота потолков"
            value={property.ceilingH ? `${property.ceilingH} м` : "—"}
          />
          <Row
            label="Вход"
            value={property.entrance ? ENTRANCE_LABELS[property.entrance] : "—"}
          />
          <Row
            label="Состояние"
            value={property.condition ? CONDITION_LABELS[property.condition] : "—"}
          />
          <Row
            label="Метро"
            value={
              <span className="inline-flex items-center gap-1">
                <Train className="w-3.5 h-3.5" />
                {property.metro
                  ? `${property.metro}${property.metroWalk ? `, ${property.metroWalk} мин` : ""}`
                  : "—"}
              </span>
            }
          />
          <Row
            label="Площадь"
            value={
              <span className="inline-flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" />
                {property.area ? `${property.area} кв.м` : "—"}
              </span>
            }
          />
        </section>

        <section className="card p-4 space-y-3">
          <h3 className="font-display text-sm font-semibold">Дополнительно</h3>
          {property.sourceUrl ? (
            <a
              href={property.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Объявление в источнике
            </a>
          ) : (
            <div className="text-sm text-text-muted">Ссылка на объявление не указана</div>
          )}
          <div>
            <div className="text-xs text-text-muted font-medium mb-1.5">Заметки</div>
            <PropertyNotes propertyId={property.id} initialNotes={property.notes} />
          </div>
        </section>
      </div>
    </div>
  );
}
