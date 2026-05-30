"use client";

import { Plus, Trash2 } from "lucide-react";

export type TenantDraft = {
  name: string;
  category: string;
  area: string;
  rentMonth: string;
  leaseStart: string;
  leaseEnd: string;
  deposit: string;
  notes: string;
};

export function emptyTenant(): TenantDraft {
  return {
    name: "",
    category: "",
    area: "",
    rentMonth: "",
    leaseStart: "",
    leaseEnd: "",
    deposit: "",
    notes: "",
  };
}

function TenantRow({
  tenant,
  index,
  onChange,
  onRemove,
}: {
  tenant: TenantDraft;
  index: number;
  onChange: (next: TenantDraft) => void;
  onRemove: () => void;
}) {
  const set = (key: keyof TenantDraft, value: string) =>
    onChange({ ...tenant, [key]: value });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">Арендатор {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-expense inline-flex items-center gap-1 hover:underline"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Удалить
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2">
          <span className="label">Название / бренд</span>
          <input
            required
            value={tenant.name}
            onChange={(e) => set("name", e.target.value)}
            className="input"
            placeholder="ВкусВилл"
          />
        </label>
        <label className="block">
          <span className="label">Категория</span>
          <input
            value={tenant.category}
            onChange={(e) => set("category", e.target.value)}
            className="input"
            placeholder="Еда / медицина / банк"
          />
        </label>
        <label className="block">
          <span className="label">Площадь, кв.м</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={tenant.area}
            onChange={(e) => set("area", e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">Аренда в месяц, ₽</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={tenant.rentMonth}
            onChange={(e) => set("rentMonth", e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">Депозит, ₽</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={tenant.deposit}
            onChange={(e) => set("deposit", e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">Начало договора</span>
          <input
            type="date"
            value={tenant.leaseStart}
            onChange={(e) => set("leaseStart", e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">Конец договора</span>
          <input
            type="date"
            value={tenant.leaseEnd}
            onChange={(e) => set("leaseEnd", e.target.value)}
            className="input"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Заметки</span>
          <textarea
            rows={2}
            value={tenant.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input !h-auto py-2"
          />
        </label>
      </div>
    </div>
  );
}

export function TenantsSection({
  hasTenants,
  setHasTenants,
  tenants,
  setTenants,
  tenantPlan,
  setTenantPlan,
  vacancyMonths,
  setVacancyMonths,
}: {
  hasTenants: boolean;
  setHasTenants: (v: boolean) => void;
  tenants: TenantDraft[];
  setTenants: (next: TenantDraft[]) => void;
  tenantPlan: string;
  setTenantPlan: (v: string) => void;
  vacancyMonths: string;
  setVacancyMonths: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-bg">
        <button
          type="button"
          onClick={() => setHasTenants(true)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            hasTenants
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Есть арендаторы
        </button>
        <button
          type="button"
          onClick={() => setHasTenants(false)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            !hasTenants
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Арендаторов нет
        </button>
      </div>

      {hasTenants ? (
        <div className="space-y-3">
          {tenants.map((t, i) => (
            <TenantRow
              key={i}
              tenant={t}
              index={i}
              onChange={(next) => {
                const copy = tenants.slice();
                copy[i] = next;
                setTenants(copy);
              }}
              onRemove={() => setTenants(tenants.filter((_, idx) => idx !== i))}
            />
          ))}
          <button
            type="button"
            onClick={() => setTenants([...tenants, emptyTenant()])}
            className="btn btn-ghost"
          >
            <Plus className="w-4 h-4" />
            Добавить арендатора
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="label">Планы по объекту</span>
            <textarea
              rows={3}
              value={tenantPlan}
              onChange={(e) => setTenantPlan(e.target.value)}
              className="input !h-auto py-2"
              placeholder="Кто планируется, в какие сроки"
            />
          </label>
          <label className="block">
            <span className="label">Вакантен (месяцев)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={vacancyMonths}
              onChange={(e) => setVacancyMonths(e.target.value)}
              className="input"
            />
          </label>
        </div>
      )}
    </div>
  );
}
