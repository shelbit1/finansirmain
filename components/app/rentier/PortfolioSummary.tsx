import { Building2, Coins, TrendingUp, Users } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type {
  RentierPropertyStatus,
  RentierPropertyType,
} from "@prisma/client";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/rentier";
import { YieldBadge } from "./YieldBadge";

export type PortfolioSummaryData = {
  totalProperties: number;
  byStatus: Record<RentierPropertyStatus, number>;
  byType: Record<RentierPropertyType, number>;
  totalInvested: number;
  totalRentMonth: number;
  avgGrossYield: number | null;
  avgNetYield: number | null;
  tenantsCount: number;
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display text-xl sm:text-2xl font-bold tracking-tight tnum">
        {value}
      </div>
      {hint && <div className="text-xs text-text-muted mt-1">{hint}</div>}
    </div>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: { key: string; label: string; count: number }[];
}) {
  const total = items.reduce((s, it) => s + it.count, 0);
  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-semibold mb-3">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-text-muted">Пока пусто</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.key}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-text-muted tnum">
                    {item.count} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function PortfolioSummary({ data }: { data: PortfolioSummaryData }) {
  const byTypeItems = (Object.keys(data.byType) as RentierPropertyType[])
    .map((k) => ({
      key: k,
      label: `${PROPERTY_TYPE_LABELS[k].emoji} ${PROPERTY_TYPE_LABELS[k].label}`,
      count: data.byType[k],
    }))
    .filter((it) => it.count > 0)
    .sort((a, b) => b.count - a.count);

  const byStatusItems = (Object.keys(data.byStatus) as RentierPropertyStatus[])
    .map((k) => ({
      key: k,
      label: PROPERTY_STATUS_LABELS[k].label,
      count: data.byStatus[k],
    }))
    .filter((it) => it.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Building2}
          label="Объектов"
          value={data.totalProperties}
        />
        <StatCard
          icon={Coins}
          label="Инвестировано"
          value={data.totalInvested ? formatMoney(data.totalInvested, "RUB") : "—"}
          hint="по статусу «Куплен»"
        />
        <StatCard
          icon={TrendingUp}
          label="Средн. чист. доходность"
          value={<YieldBadge value={data.avgNetYield} />}
          hint={
            data.avgGrossYield !== null
              ? `Валовая: ${data.avgGrossYield}%`
              : undefined
          }
        />
        <StatCard
          icon={Users}
          label="Арендаторов"
          value={data.tenantsCount}
          hint={
            data.totalRentMonth
              ? `${formatMoney(data.totalRentMonth)} /мес`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownList title="По типам" items={byTypeItems} />
        <BreakdownList title="По статусам" items={byStatusItems} />
      </div>
    </div>
  );
}
