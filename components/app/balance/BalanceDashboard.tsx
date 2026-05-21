"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  BalanceHistoryResponse,
  Granularity,
  Period,
} from "@/lib/balanceHistoryTypes";
import { NetWorthHeader } from "./NetWorthHeader";
import { BalanceSummaryCards } from "./BalanceSummaryCards";
import { AssetsBreakdown } from "./AssetsBreakdown";
import { DebtsBreakdown } from "./DebtsBreakdown";
import { BalanceSkeleton } from "./BalanceSkeleton";

function autoGranularity(period: Period): Granularity {
  if (period === "1W" || period === "1M") return "day";
  if (period === "3M" || period === "6M") return "week";
  return "month";
}

function periodToDates(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case "1W":
      from.setDate(from.getDate() - 7);
      break;
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6M":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    case "ALL":
      from.setFullYear(2020, 0, 1);
      break;
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const DEFAULT_PERIOD: Period = "3M";

export function BalanceDashboard() {
  const [data, setData] = useState<BalanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = periodToDates(DEFAULT_PERIOD);
    const granularity: Granularity = autoGranularity(DEFAULT_PERIOD);
    const url = `/api/balance/history?from=${from}&to=${to}&granularity=${granularity}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BalanceHistoryResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !data) return <BalanceSkeleton />;

  if (error && !data) {
    return (
      <EmptyState icon={Scale} title="Ошибка загрузки" description={error} />
    );
  }
  if (!data) return null;

  const empty =
    data.current.accountsBreakdown.length === 0 &&
    data.current.assetsBreakdown.length === 0 &&
    data.current.receivablesDetail.length === 0 &&
    data.current.liabilitiesDetail.length === 0;

  if (empty) {
    return (
      <EmptyState
        icon={Scale}
        title="Нет данных для отчёта"
        description="Добавьте счета, активы или зафиксируйте долги — и баланс появится автоматически"
      />
    );
  }

  return (
    <div className="space-y-4">
      <NetWorthHeader netWorth={data.current.netWorth} />
      <BalanceSummaryCards current={data.current} />
      <AssetsBreakdown items={data.current.assetsBreakdown} />
      <DebtsBreakdown
        receivables={data.current.receivablesDetail}
        liabilities={data.current.liabilitiesDetail}
      />
    </div>
  );
}
