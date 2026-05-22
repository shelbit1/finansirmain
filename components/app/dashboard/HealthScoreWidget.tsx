"use client";

import { useEffect, useState } from "react";
import { HelpCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  HealthScoreResponse,
  HealthZone,
} from "@/app/api/health-score/route";

const ZONE_LABEL: Record<HealthZone, string> = {
  excellent: "Отличное",
  good: "Хорошее",
  coping: "Стабилизируется",
  vulnerable: "Уязвимое",
};

const ZONE_EMOJI: Record<HealthZone, string> = {
  excellent: "💚",
  good: "💙",
  coping: "💛",
  vulnerable: "🔴",
};

const ZONE_COLOR: Record<HealthZone, string> = {
  excellent: "#22c55e",
  good: "#3d7eff",
  coping: "#eab308",
  vulnerable: "#ef4444",
};

function componentColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

export function HealthScoreWidget() {
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const res = await fetch("/api/health-score", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить");
      const json: HealthScoreResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  if (loading) return <Skeleton />;

  if (error || !data) {
    return (
      <div className="card p-5">
        <Header refreshing={false} onRefresh={() => void load(true)} />
        <p className="text-sm text-text-muted mt-3">
          {error ?? "Нет данных для расчёта"}
        </p>
      </div>
    );
  }

  const { score, zone, components, tips } = data;
  const color = ZONE_COLOR[zone];

  return (
    <div className="card p-4 sm:p-5">
      <Header refreshing={refreshing} onRefresh={() => void load(true)} />

      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
        <div className="shrink-0 mx-auto md:mx-0">
          <GaugeBlock score={score} color={color} zone={zone} />
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ComponentCard data={components.incomeExpense} />
          <ComponentCard data={components.cushion} />
          <ComponentCard data={components.debtDynamics} />
          <ComponentCard data={components.goals} />
        </div>
      </div>

      {tips.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-5">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="flex gap-2 text-sm text-text-muted leading-snug flex-1 min-w-0"
            >
              <span className="shrink-0">💡</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="font-display text-lg font-semibold truncate">
          Финансовое здоровье
        </h3>
        <HelpTooltip />
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Обновить"
        className="p-1.5 text-text-muted hover:text-text rounded-lg disabled:opacity-50"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
      </button>
    </div>
  );
}

function GaugeBlock({
  score,
  color,
  zone,
}: {
  score: number;
  color: string;
  zone: HealthZone;
}) {
  const radius = 80;
  const length = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = length * (1 - clamped / 100);

  return (
    <div className="relative w-[180px]">
      <svg viewBox="0 0 200 120" className="w-full h-auto" aria-hidden>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center pointer-events-none">
        <span
          className="font-display text-4xl font-bold tnum leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
          из 100
        </span>
      </div>
      <p
        className="text-center text-sm font-medium mt-1"
        style={{ color }}
      >
        {ZONE_LABEL[zone]} {ZONE_EMOJI[zone]}
      </p>
    </div>
  );
}

function ComponentCard({
  data,
}: {
  data: { label: string; score: number; detail: string; weight: number };
}) {
  const color = componentColor(data.score);
  const width = Math.max(0, Math.min(100, data.score));
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-3 min-w-0 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide leading-tight min-w-0">
          {data.label}
        </span>
        <span className="text-[10px] text-text-muted shrink-0 leading-tight pt-0.5">
          {data.weight}%
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span
          className="font-display text-2xl font-bold tnum leading-none"
          style={{ color }}
        >
          {data.score}
        </span>
        <span className="text-xs text-text-muted">/ 100</span>
      </div>
      <div className="h-1 bg-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-text-muted mt-2 leading-snug">{data.detail}</p>
    </div>
  );
}

function HelpTooltip() {
  return (
    <span
      className="relative inline-flex items-center group text-text-muted hover:text-text"
      tabIndex={0}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 mt-1 w-64 z-20 hidden group-hover:block group-focus-within:block card border border-border px-3 py-2 text-xs text-text-muted shadow-lg"
      >
        Считается по данным за последние 30–90 дней: доходы/расходы (30%),
        подушка безопасности (25%), динамика долгов (25%), выполнение планов
        (20%).
      </span>
    </span>
  );
}

function Skeleton() {
  return (
    <div className="card p-4 sm:p-5 animate-pulse">
      <div className="h-4 w-44 bg-bg rounded mb-4" />
      <div className="flex flex-col md:flex-row gap-5 md:items-center">
        <div className="h-24 w-44 bg-bg rounded-t-full mx-auto md:mx-0" />
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-bg rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
