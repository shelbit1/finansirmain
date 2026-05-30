"use client";

import type {
  RentierCondition,
  RentierEntrance,
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";
import {
  CONDITION_LABELS,
  ENTRANCE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/rentier";

export function BasicSection({
  type,
  setType,
  status,
  setStatus,
  title,
  setTitle,
  sourceUrl,
  setSourceUrl,
  notes,
  setNotes,
}: {
  type: RentierPropertyType;
  setType: (v: RentierPropertyType) => void;
  status: RentierPropertyStatus;
  setStatus: (v: RentierPropertyStatus) => void;
  title: string;
  setTitle: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <section className="card p-4 sm:p-5 space-y-4">
      <h3 className="font-display text-base font-semibold">Основное</h3>
      <div>
        <span className="label">Тип объекта</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PROPERTY_TYPE_LABELS) as RentierPropertyType[]).map((t) => {
            const active = t === type;
            const meta = PROPERTY_TYPE_LABELS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-bg"
                }`}
              >
                <span className="shrink-0 font-semibold text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-border bg-bg">
                  {meta.abbr}
                </span>
                <span className="truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Статус</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RentierPropertyStatus)}
            className="input"
          >
            {(Object.keys(PROPERTY_STATUS_LABELS) as RentierPropertyStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {PROPERTY_STATUS_LABELS[s].label}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block">
          <span className="label">Название / короткий адрес</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="ТЦ «Метрополис», ул. Ленина 15"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Ссылка на объявление</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="input"
            placeholder="https://www.cian.ru/..."
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Заметки</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input !h-auto py-2"
          />
        </label>
      </div>
    </section>
  );
}

export type GeographyValues = {
  city: string;
  district: string;
  address: string;
  metro: string;
  metroWalk: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
};

export function GeographySection({
  values,
  set,
}: {
  values: GeographyValues;
  set: (key: keyof GeographyValues, value: string) => void;
}) {
  return (
    <section className="card p-4 sm:p-5 space-y-4">
      <h3 className="font-display text-base font-semibold">География</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Город</span>
          <input value={values.city} onChange={(e) => set("city", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Район / округ</span>
          <input value={values.district} onChange={(e) => set("district", e.target.value)} className="input" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Полный адрес</span>
          <input value={values.address} onChange={(e) => set("address", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Ближайшее метро</span>
          <input value={values.metro} onChange={(e) => set("metro", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Минут пешком до метро</span>
          <input type="number" inputMode="numeric" min={0} value={values.metroWalk} onChange={(e) => set("metroWalk", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Этаж</span>
          <input type="number" inputMode="numeric" value={values.floor} onChange={(e) => set("floor", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Всего этажей</span>
          <input type="number" inputMode="numeric" min={0} value={values.totalFloors} onChange={(e) => set("totalFloors", e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Год постройки</span>
          <input type="number" inputMode="numeric" min={1800} max={2100} value={values.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} className="input" />
        </label>
      </div>
    </section>
  );
}

export function ParametersSection({
  area,
  setArea,
  ceilingH,
  setCeilingH,
  entrance,
  setEntrance,
  condition,
  setCondition,
}: {
  area: string;
  setArea: (v: string) => void;
  ceilingH: string;
  setCeilingH: (v: string) => void;
  entrance: RentierEntrance | "";
  setEntrance: (v: RentierEntrance | "") => void;
  condition: RentierCondition | "";
  setCondition: (v: RentierCondition | "") => void;
}) {
  return (
    <section className="card p-4 sm:p-5 space-y-4">
      <h3 className="font-display text-base font-semibold">Параметры</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Площадь, кв.м</span>
          <input type="number" inputMode="decimal" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Высота потолков, м</span>
          <input type="number" inputMode="decimal" step="0.01" value={ceilingH} onChange={(e) => setCeilingH(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Вход</span>
          <select value={entrance} onChange={(e) => setEntrance(e.target.value as RentierEntrance | "")} className="input">
            <option value="">—</option>
            {(Object.keys(ENTRANCE_LABELS) as RentierEntrance[]).map((k) => (
              <option key={k} value={k}>
                {ENTRANCE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Состояние</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value as RentierCondition | "")} className="input">
            <option value="">—</option>
            {(Object.keys(CONDITION_LABELS) as RentierCondition[]).map((k) => (
              <option key={k} value={k}>
                {CONDITION_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
