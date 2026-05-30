"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  RentierCondition,
  RentierEntrance,
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";
import { type SerializedProperty } from "@/lib/rentier";
import { toInputDate } from "@/lib/utils";
import {
  EconomicsSection,
  type EconomicsKey,
  type EconomicsValues,
} from "./EconomicsSection";
import { TenantsSection, type TenantDraft } from "./TenantsSection";
import {
  BasicSection,
  GeographySection,
  ParametersSection,
  type GeographyValues,
} from "./PropertyFormSections";

const num = (v: number | null) => (v === null ? "" : String(v));

function initialEconomics(p?: SerializedProperty): EconomicsValues {
  return {
    askPrice: num(p?.askPrice ?? null),
    ownPrice: num(p?.ownPrice ?? null),
    pricePerSqm: num(p?.pricePerSqm ?? null),
    rentMonth: num(p?.rentMonth ?? null),
    rentPerSqm: num(p?.rentPerSqm ?? null),
    rentIndexPct: num(p?.rentIndexPct ?? null),
    communal: num(p?.communal ?? null),
    tax: num(p?.tax ?? null),
    management: num(p?.management ?? null),
    otherCosts: num(p?.otherCosts ?? null),
    area: num(p?.area ?? null),
  };
}

function initialGeo(p?: SerializedProperty): GeographyValues {
  return {
    city: p?.city ?? "",
    district: p?.district ?? "",
    address: p?.address ?? "",
    metro: p?.metro ?? "",
    metroWalk: num(p?.metroWalk ?? null),
    floor: num(p?.floor ?? null),
    totalFloors: num(p?.totalFloors ?? null),
    yearBuilt: num(p?.yearBuilt ?? null),
  };
}

function initialTenants(p?: SerializedProperty): TenantDraft[] {
  if (!p?.tenants?.length) return [];
  return p.tenants.map((t) => ({
    name: t.name,
    category: t.category ?? "",
    area: num(t.area),
    rentMonth: num(t.rentMonth),
    leaseStart: t.leaseStart ? toInputDate(new Date(t.leaseStart)) : "",
    leaseEnd: t.leaseEnd ? toInputDate(new Date(t.leaseEnd)) : "",
    deposit: num(t.deposit),
    notes: t.notes ?? "",
  }));
}

const toNum = (v: string): number | null => {
  if (!v) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function PropertyForm({ property }: { property?: SerializedProperty }) {
  const router = useRouter();
  const isEdit = Boolean(property);

  const [type, setType] = useState<RentierPropertyType>(
    property?.type ?? "STREET_RETAIL",
  );
  const [status, setStatus] = useState<RentierPropertyStatus>(
    property?.status ?? "WATCHING",
  );
  const [title, setTitle] = useState(property?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(property?.sourceUrl ?? "");
  const [notes, setNotes] = useState(property?.notes ?? "");

  const [geo, setGeo] = useState<GeographyValues>(initialGeo(property));
  const updateGeo = (k: keyof GeographyValues, v: string) =>
    setGeo((prev) => ({ ...prev, [k]: v }));

  const [ceilingH, setCeilingH] = useState(num(property?.ceilingH ?? null));
  const [entrance, setEntrance] = useState<RentierEntrance | "">(
    property?.entrance ?? "",
  );
  const [condition, setCondition] = useState<RentierCondition | "">(
    property?.condition ?? "",
  );

  const [econ, setEcon] = useState<EconomicsValues>(initialEconomics(property));
  const updateEcon = (k: EconomicsKey, v: string) =>
    setEcon((prev) => ({ ...prev, [k]: v }));

  const [hasTenants, setHasTenants] = useState(property?.hasTenants ?? false);
  const [tenants, setTenants] = useState<TenantDraft[]>(initialTenants(property));
  const [tenantPlan, setTenantPlan] = useState(property?.tenantPlan ?? "");
  const [vacancyMonths, setVacancyMonths] = useState(
    num(property?.vacancyMonths ?? null),
  );

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const payload = {
      type,
      status,
      title: title.trim(),
      notes: notes.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      city: geo.city.trim() || null,
      district: geo.district.trim() || null,
      address: geo.address.trim() || null,
      metro: geo.metro.trim() || null,
      metroWalk: toNum(geo.metroWalk),
      floor: toNum(geo.floor),
      totalFloors: toNum(geo.totalFloors),
      yearBuilt: toNum(geo.yearBuilt),
      area: toNum(econ.area),
      ceilingH: toNum(ceilingH),
      entrance: entrance || null,
      condition: condition || null,
      askPrice: toNum(econ.askPrice),
      ownPrice: toNum(econ.ownPrice),
      pricePerSqm: toNum(econ.pricePerSqm),
      rentMonth: toNum(econ.rentMonth),
      rentPerSqm: toNum(econ.rentPerSqm),
      rentIndexPct: toNum(econ.rentIndexPct),
      communal: toNum(econ.communal),
      tax: toNum(econ.tax),
      management: toNum(econ.management),
      otherCosts: toNum(econ.otherCosts),
      hasTenants,
      tenantPlan: hasTenants ? null : tenantPlan.trim() || null,
      vacancyMonths: hasTenants ? null : toNum(vacancyMonths),
      tenants: hasTenants
        ? tenants.map((t) => ({
            name: t.name.trim(),
            category: t.category.trim() || null,
            area: toNum(t.area),
            rentMonth: toNum(t.rentMonth),
            leaseStart: t.leaseStart || null,
            leaseEnd: t.leaseEnd || null,
            deposit: toNum(t.deposit),
            notes: t.notes.trim() || null,
          }))
        : [],
    };

    try {
      const url = isEdit
        ? `/api/rentier/properties/${property!.id}`
        : "/api/rentier/properties";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось сохранить");
      }
      const data = (await res.json()) as { property: { id: string } };
      router.push(`/rentier/properties/${data.property.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!property || !confirm("Удалить объект безвозвратно?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rentier/properties/${property.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось удалить");
      }
      router.push("/rentier/properties");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <BasicSection
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
        title={title}
        setTitle={setTitle}
        sourceUrl={sourceUrl}
        setSourceUrl={setSourceUrl}
        notes={notes}
        setNotes={setNotes}
      />

      <GeographySection values={geo} set={updateGeo} />

      <ParametersSection
        area={econ.area}
        setArea={(v) => updateEcon("area", v)}
        ceilingH={ceilingH}
        setCeilingH={setCeilingH}
        entrance={entrance}
        setEntrance={setEntrance}
        condition={condition}
        setCondition={setCondition}
      />

      <section className="card p-4 sm:p-5 space-y-4">
        <h3 className="font-display text-base font-semibold">Экономика</h3>
        <EconomicsSection values={econ} onChange={updateEcon} />
      </section>

      <section className="card p-4 sm:p-5 space-y-4">
        <h3 className="font-display text-base font-semibold">Арендаторы</h3>
        <TenantsSection
          hasTenants={hasTenants}
          setHasTenants={setHasTenants}
          tenants={tenants}
          setTenants={setTenants}
          tenantPlan={tenantPlan}
          setTenantPlan={setTenantPlan}
          vacancyMonths={vacancyMonths}
          setVacancyMonths={setVacancyMonths}
        />
      </section>

      {error && (
        <div className="card p-4 text-sm text-expense bg-rose-50 border-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать объект"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-ghost"
          >
            Отмена
          </button>
        </div>
        {isEdit && (
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="btn btn-danger"
          >
            {deleting ? "Удаляем…" : "Удалить объект"}
          </button>
        )}
      </div>

    </form>
  );
}
