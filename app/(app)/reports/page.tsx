import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  buildReport,
  type ReportGranularity,
} from "@/lib/reportBuilder";
import { ReportFilters } from "@/components/app/reports/ReportFilters";
import { ReportTable } from "@/components/app/reports/ReportTable";
import { formatMoney, toInputDate } from "@/lib/utils";

export const metadata = { title: "Доходы и расходы — Финансыр" };

function parseGranularity(v: string | undefined): ReportGranularity {
  return v === "day" || v === "week" || v === "month" ? v : "month";
}

function parseDate(v: string | undefined, fallback: Date): Date {
  if (!v) return fallback;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireActiveSubscription();
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const granParam = typeof sp.granularity === "string" ? sp.granularity : undefined;

  const from = parseDate(fromParam, defaultFrom);
  const to = parseDate(toParam, defaultTo);
  const granularity = parseGranularity(granParam);

  const report = await buildReport(userId, from, to, granularity);

  return (
    <>
      <PageHeader
        title="Доходы и расходы"
        subtitle="По статьям с разбивкой по периодам"
      />

      <ReportFilters
        from={toInputDate(from)}
        to={toInputDate(to)}
        granularity={granularity}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <SummaryTile
          label="Доходы"
          value={report.income.total}
          color="var(--color-income)"
        />
        <SummaryTile
          label="Расходы"
          value={report.expense.total}
          color="var(--color-expense)"
        />
        <SummaryTile
          label="Долги (оборот)"
          value={report.debt.total}
          color="var(--color-debt-owe)"
        />
        <SummaryTile
          label="Сальдо"
          value={report.saldoTotal}
          color={report.saldoTotal >= 0 ? "var(--color-income)" : "var(--color-expense)"}
        />
      </div>

      <ReportTable data={report} />
    </>
  );
}

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-3 sm:p-4 min-w-0">
      <p className="text-xs sm:text-sm text-text-muted truncate">{label}</p>
      <p
        className="font-display text-lg sm:text-2xl font-bold tnum mt-0.5 truncate"
        style={{ color }}
      >
        {formatMoney(value, "RUB")}
      </p>
    </div>
  );
}
