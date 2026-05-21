"use client";

import { useState } from "react";
import {
  ChevronDown,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  HandCoins,
  Coins,
} from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  ReportData,
  ReportRow,
  ReportSection,
} from "@/lib/reportBuilder";

function fmt(value: number): string {
  if (value === 0) return "—";
  return formatMoney(value, "RUB");
}

export function ReportTable({ data }: { data: ReportData }) {
  const [openIncome, setOpenIncome] = useState(true);
  const [openExpense, setOpenExpense] = useState(true);
  const [openAsset, setOpenAsset] = useState(false);
  const [openDebt, setOpenDebt] = useState(false);

  const hasData =
    data.income.total > 0 ||
    data.expense.total > 0 ||
    data.asset.total > 0 ||
    data.debt.total > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="За этот период нет операций"
        description="Попробуйте другой диапазон дат или добавьте доходы и расходы"
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg/60 border-b border-border">
            <tr>
              <th className="sticky left-0 z-10 bg-bg/60 text-left font-semibold px-4 py-3 min-w-[200px]">
                По статьям
              </th>
              <th className="text-right font-semibold px-4 py-3 whitespace-nowrap bg-bg/80 min-w-[120px]">
                Итого
              </th>
              {data.periods.map((p) => (
                <th
                  key={p.key}
                  className="text-right font-medium text-text-muted px-3 py-3 whitespace-nowrap min-w-[110px]"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionRows
              label="Доходы"
              icon="↓"
              color="var(--color-income)"
              section={data.income}
              open={openIncome}
              onToggle={() => setOpenIncome((v) => !v)}
              periodCount={data.periods.length}
            />

            <tr aria-hidden>
              <td colSpan={data.periods.length + 2} className="h-2" />
            </tr>

            <SectionRows
              label="Расходы"
              icon="↑"
              color="var(--color-expense)"
              section={data.expense}
              open={openExpense}
              onToggle={() => setOpenExpense((v) => !v)}
              periodCount={data.periods.length}
            />

            <tr aria-hidden>
              <td colSpan={data.periods.length + 2} className="h-2" />
            </tr>

            <SectionRows
              label="Активы"
              icon={<Coins className="w-3.5 h-3.5" />}
              color="var(--color-asset)"
              section={data.asset}
              open={openAsset}
              onToggle={() => setOpenAsset((v) => !v)}
              periodCount={data.periods.length}
              note="Не влияет на сальдо"
            />

            <tr aria-hidden>
              <td colSpan={data.periods.length + 2} className="h-2" />
            </tr>

            <SectionRows
              label="Долги"
              icon={<HandCoins className="w-3.5 h-3.5" />}
              color="var(--color-debt-owe)"
              section={data.debt}
              open={openDebt}
              onToggle={() => setOpenDebt((v) => !v)}
              periodCount={data.periods.length}
              keepEmptyRows
              note="Не влияет на сальдо"
            />
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr className="bg-bg/60">
              <td className="sticky left-0 z-10 bg-bg/80 px-4 py-3 font-display font-bold text-base">
                <span className="inline-flex items-center gap-2">
                  {data.saldoTotal >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-income" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-expense" />
                  )}
                  Сальдо
                </span>
              </td>
              <td
                className="px-4 py-3 text-right font-display font-bold text-base tnum whitespace-nowrap bg-bg/80"
                style={{
                  color:
                    data.saldoTotal >= 0 ? "var(--color-income)" : "var(--color-expense)",
                }}
              >
                {fmt(data.saldoTotal)}
              </td>
              {data.saldoByPeriod.map((v, i) => (
                <td
                  key={i}
                  className="px-3 py-3 text-right font-semibold tnum whitespace-nowrap"
                  style={{ color: v >= 0 ? "var(--color-income)" : "var(--color-expense)" }}
                >
                  {fmt(v)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SectionRows({
  label,
  icon,
  color,
  section,
  open,
  onToggle,
  periodCount,
  keepEmptyRows = false,
  note,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  section: ReportSection;
  open: boolean;
  onToggle: () => void;
  periodCount: number;
  keepEmptyRows?: boolean;
  note?: string;
}) {
  const visibleRows = keepEmptyRows
    ? section.rows
    : section.rows.filter((r) => r.total > 0);

  return (
    <>
      <tr className="border-b border-border bg-surface">
        <td
          className="sticky left-0 z-10 bg-surface px-4 py-2.5 cursor-pointer select-none"
          onClick={onToggle}
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-text-muted transition-transform shrink-0",
                !open && "-rotate-90",
              )}
            />
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
            >
              {icon}
            </span>
            {label}
            {note && (
              <span className="text-xs text-text-muted font-normal italic">
                · {note}
              </span>
            )}
          </span>
        </td>
        <td
          className="px-4 py-2.5 text-right font-semibold tnum whitespace-nowrap bg-bg/40"
          style={{ color }}
        >
          {fmt(section.total)}
        </td>
        {section.byPeriod.map((v, i) => (
          <td
            key={i}
            className="px-3 py-2.5 text-right font-semibold tnum whitespace-nowrap"
            style={{ color }}
          >
            {fmt(v)}
          </td>
        ))}
      </tr>

      {open &&
        visibleRows.map((row) => (
          <CategoryRow key={row.id} row={row} periodCount={periodCount} />
        ))}

      {open && visibleRows.length === 0 && (
        <tr>
          <td
            colSpan={periodCount + 2}
            className="px-12 py-2.5 text-sm text-text-muted italic"
          >
            Нет операций за период
          </td>
        </tr>
      )}
    </>
  );
}

function CategoryRow({ row, periodCount }: { row: ReportRow; periodCount: number }) {
  return (
    <tr className="border-b border-border hover:bg-bg/40">
      <td className="sticky left-0 z-10 bg-surface hover:bg-bg/40 pl-12 pr-4 py-2">
        <span className="inline-flex items-center gap-2">
          {row.icon && <span className="text-base shrink-0">{row.icon}</span>}
          <span className="truncate">{row.name}</span>
        </span>
      </td>
      <td className="px-4 py-2 text-right font-medium tnum whitespace-nowrap bg-bg/40">
        {fmt(row.total)}
      </td>
      {row.byPeriod.map((v, i) => (
        <td key={i} className="px-3 py-2 text-right tnum whitespace-nowrap text-text-muted">
          {fmt(v)}
        </td>
      ))}
      {/* periodCount used to keep types stable */}
      <td hidden aria-hidden>{periodCount}</td>
    </tr>
  );
}
