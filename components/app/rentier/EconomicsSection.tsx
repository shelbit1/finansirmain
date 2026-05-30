"use client";

import { TrendingUp } from "lucide-react";
import { YieldBadge } from "./YieldBadge";
import { calcYields } from "@/lib/rentier";

export type EconomicsValues = {
  askPrice: string;
  ownPrice: string;
  pricePerSqm: string;
  rentMonth: string;
  rentPerSqm: string;
  rentIndexPct: string;
  communal: string;
  communalPaidBy: string;
  tax: string;
  management: string;
  otherCosts: string;
  area: string;
};

export type EconomicsKey = keyof EconomicsValues;

const num = (v: string): number | null => {
  if (!v) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function liveYields(values: EconomicsValues) {
  return calcYields({
    askPrice: num(values.askPrice),
    ownPrice: num(values.ownPrice),
    rentMonth: num(values.rentMonth),
    communal: num(values.communal),
    tax: num(values.tax),
    management: num(values.management),
    otherCosts: num(values.otherCosts),
    area: num(values.area),
  });
}

function Field({
  label,
  hint,
  name,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  hint?: string;
  name: EconomicsKey;
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step ?? "0.01"}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-12"
          placeholder="—"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-xs text-text-muted mt-1 block">{hint}</span>}
    </label>
  );
}

export function EconomicsSection({
  values,
  onChange,
}: {
  values: EconomicsValues;
  onChange: (key: EconomicsKey, next: string) => void;
}) {
  const y = liveYields(values);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs uppercase tracking-wide text-text-muted font-semibold mb-3">
          Цена
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Цена продавца" suffix="₽" name="askPrice" value={values.askPrice} onChange={(v) => onChange("askPrice", v)} />
          <Field label="Своя оценка" suffix="₽" name="ownPrice" value={values.ownPrice} onChange={(v) => onChange("ownPrice", v)} />
          <Field
            label="Цена за кв.м"
            suffix="₽"
            name="pricePerSqm"
            value={values.pricePerSqm}
            onChange={(v) => onChange("pricePerSqm", v)}
            hint={y.pricePerSqm ? `Рассчитано: ${y.pricePerSqm.toLocaleString("ru-RU")} ₽` : undefined}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-text-muted font-semibold mb-3">
          Аренда
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Аренда в месяц" suffix="₽/мес" name="rentMonth" value={values.rentMonth} onChange={(v) => onChange("rentMonth", v)} />
          <Field label="Аренда за кв.м" suffix="₽/кв.м" name="rentPerSqm" value={values.rentPerSqm} onChange={(v) => onChange("rentPerSqm", v)} />
          <Field label="Индексация" suffix="%/год" name="rentIndexPct" value={values.rentIndexPct} onChange={(v) => onChange("rentIndexPct", v)} />
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-text-muted font-semibold mb-3">
          Расходы
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Коммуналка" suffix="₽/мес" name="communal" value={values.communal} onChange={(v) => onChange("communal", v)} />
          <label className="block sm:col-span-2">
            <span className="label">Кто платит за коммунальные услуги</span>
            <input
              type="text"
              value={values.communalPaidBy}
              onChange={(e) => onChange("communalPaidBy", e.target.value)}
              className="input"
              placeholder="Напишите максимально подробно по распределению КУ"
            />
          </label>
          <Field label="Налог на имущество" suffix="₽/год" name="tax" value={values.tax} onChange={(v) => onChange("tax", v)} />
          <Field label="Управление" suffix="₽/мес" name="management" value={values.management} onChange={(v) => onChange("management", v)} />
          <Field label="Прочие расходы" suffix="₽/мес" name="otherCosts" value={values.otherCosts} onChange={(v) => onChange("otherCosts", v)} />
        </div>
      </div>

      <div className="rounded-lg bg-bg border border-border p-4">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide text-text-muted font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          Расчётные показатели
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-text-muted mb-1">Валовая</div>
            <YieldBadge value={y.grossYield} />
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Чистая</div>
            <YieldBadge value={y.netYield} />
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Окупаемость</div>
            <div className="font-display font-semibold tnum">
              {y.paybackYears !== null ? `${y.paybackYears} лет` : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
