import type {
  RentierProperty,
  RentierTenant,
  RentierPropertyType,
  RentierPropertyStatus,
  RentierEntrance,
  RentierCondition,
  Prisma,
} from "@prisma/client";

export const PROPERTY_TYPE_LABELS: Record<
  RentierPropertyType,
  { label: string; abbr: string }
> = {
  FREE_PURPOSE: { label: "Своб. назначения (ПСН)", abbr: "ПСН" },
  STREET_RETAIL: { label: "Стрит-ритейл", abbr: "СР" },
  SHOPPING_CENTER: { label: "Помещение в ТЦ", abbr: "ТЦ" },
  LAND: { label: "Земля", abbr: "ЗУ" },
  PARKING: { label: "Машиноместо", abbr: "ММ" },
  WAREHOUSE: { label: "Склад", abbr: "СКЛ" },
  STORAGE: { label: "Кладовка", abbr: "КЛД" },
};

export const PROPERTY_STATUS_LABELS: Record<
  RentierPropertyStatus,
  { label: string; color: string }
> = {
  WATCHING: { label: "Слежу", color: "border border-slate-200 text-slate-600 bg-slate-50" },
  NEGOTIATING: { label: "Переговоры", color: "border border-amber-200 text-amber-800 bg-amber-50" },
  OWNED: { label: "Куплен", color: "border border-emerald-200 text-emerald-800 bg-emerald-50" },
  REJECTED: { label: "Отклонён", color: "border border-rose-200 text-rose-700 bg-rose-50" },
};

export const ENTRANCE_LABELS: Record<RentierEntrance, string> = {
  STREET: "С улицы",
  YARD: "Со двора",
  SHARED: "Общий",
};

export const CONDITION_LABELS: Record<RentierCondition, string> = {
  SHELL: "Черновая",
  COSMETIC: "Косметика",
  GOOD: "Хорошее",
  EXCELLENT: "Отличное",
};

export type YieldInput = {
  askPrice?: number | null;
  ownPrice?: number | null;
  rentMonth?: number | null;
  communal?: number | null;
  tax?: number | null;
  management?: number | null;
  otherCosts?: number | null;
  area?: number | null;
};

export type YieldResult = {
  grossYield: number | null;
  netYield: number | null;
  paybackYears: number | null;
  pricePerSqm: number | null;
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Расчёт ключевых показателей по объекту. Используется и на сервере (при
 * сохранении), и на клиенте (live-preview в форме) — поэтому без сайд-эффектов.
 */
export function calcYields(data: YieldInput): YieldResult {
  const price = (data.ownPrice ?? data.askPrice) ?? null;
  if (!price || price <= 0 || !data.rentMonth || data.rentMonth <= 0) {
    return {
      grossYield: null,
      netYield: null,
      paybackYears: null,
      pricePerSqm: data.area && price ? Math.round(price / data.area) : null,
    };
  }

  const rentYear = data.rentMonth * 12;
  const costsYear =
    ((data.communal ?? 0) +
      (data.management ?? 0) +
      (data.otherCosts ?? 0)) *
      12 +
    (data.tax ?? 0);

  const grossYield = (rentYear / price) * 100;
  const netYield = ((rentYear - costsYear) / price) * 100;
  const paybackYears = netYield > 0 ? 100 / netYield : null;
  const pricePerSqm = data.area && data.area > 0 ? price / data.area : null;

  return {
    grossYield: round2(grossYield),
    netYield: round2(netYield),
    paybackYears: paybackYears !== null ? round1(paybackYears) : null,
    pricePerSqm: pricePerSqm !== null ? Math.round(pricePerSqm) : null,
  };
}

/** Цвет бейджа доходности по правилам ТЗ. */
export function yieldColor(netYield: number | null | undefined): string {
  if (netYield === null || netYield === undefined) return "bg-slate-100 text-slate-600";
  if (netYield >= 10) return "bg-emerald-100 text-emerald-700";
  if (netYield >= 7) return "bg-sky-100 text-sky-700";
  if (netYield >= 5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

/** Цена для списка/карточки: до покупки — цена продавца, после — своя. */
export function cardDisplayPrice(property: {
  status: RentierPropertyStatus;
  askPrice: number | null;
  ownPrice: number | null;
}): number | null {
  if (property.status === "OWNED") {
    return property.ownPrice ?? property.askPrice;
  }
  return property.askPrice ?? property.ownPrice;
}

type PropertyWithTenants = RentierProperty & { tenants: RentierTenant[] };

export function dec(
  v: Prisma.Decimal | number | string | null | undefined,
): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof (v as { toNumber?: () => number }).toNumber === "function") {
    const n = (v as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type SerializedTenant = {
  id: string;
  name: string;
  category: string | null;
  area: number | null;
  rentMonth: number | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  deposit: number | null;
  notes: string | null;
};

export type SerializedProperty = {
  id: string;
  type: RentierPropertyType;
  status: RentierPropertyStatus;
  title: string;
  notes: string | null;

  address: string | null;
  city: string | null;
  district: string | null;
  metro: string | null;
  metroWalk: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;

  area: number | null;
  ceilingH: number | null;
  entrance: RentierEntrance | null;
  condition: RentierCondition | null;

  askPrice: number | null;
  ownPrice: number | null;
  pricePerSqm: number | null;
  rentMonth: number | null;
  rentPerSqm: number | null;
  rentIndexPct: number | null;
  communal: number | null;
  tax: number | null;
  management: number | null;
  otherCosts: number | null;

  grossYield: number | null;
  netYield: number | null;
  paybackYears: number | null;

  hasTenants: boolean;
  tenants: SerializedTenant[];
  tenantPlan: string | null;
  vacancyMonths: number | null;

  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeTenant(t: RentierTenant): SerializedTenant {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    area: dec(t.area),
    rentMonth: dec(t.rentMonth),
    leaseStart: t.leaseStart ? t.leaseStart.toISOString() : null,
    leaseEnd: t.leaseEnd ? t.leaseEnd.toISOString() : null,
    deposit: dec(t.deposit),
    notes: t.notes,
  };
}

export function serializeProperty(p: PropertyWithTenants): SerializedProperty {
  return {
    id: p.id,
    type: p.type,
    status: p.status,
    title: p.title,
    notes: p.notes,
    address: p.address,
    city: p.city,
    district: p.district,
    metro: p.metro,
    metroWalk: p.metroWalk,
    floor: p.floor,
    totalFloors: p.totalFloors,
    yearBuilt: p.yearBuilt,
    area: dec(p.area),
    ceilingH: dec(p.ceilingH),
    entrance: p.entrance,
    condition: p.condition,
    askPrice: dec(p.askPrice),
    ownPrice: dec(p.ownPrice),
    pricePerSqm: dec(p.pricePerSqm),
    rentMonth: dec(p.rentMonth),
    rentPerSqm: dec(p.rentPerSqm),
    rentIndexPct: dec(p.rentIndexPct),
    communal: dec(p.communal),
    tax: dec(p.tax),
    management: dec(p.management),
    otherCosts: dec(p.otherCosts),
    grossYield: dec(p.grossYield),
    netYield: dec(p.netYield),
    paybackYears: dec(p.paybackYears),
    hasTenants: p.hasTenants,
    tenants: p.tenants.map(serializeTenant),
    tenantPlan: p.tenantPlan,
    vacancyMonths: p.vacancyMonths,
    sourceUrl: p.sourceUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

