"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { formatDateShort, formatMoney } from "@/lib/utils";

type Point = { date: string; value: number };

export function AssetChart({
  data,
  purchasePrice,
  currency,
}: {
  data: Point[];
  purchasePrice: number;
  currency: string;
}) {
  const series = data.map((d) => ({ ...d, label: formatDateShort(d.date) }));

  if (series.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-text-muted">
        Добавьте ещё одно обновление стоимости, чтобы увидеть динамику
      </div>
    );
  }

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v))}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => formatMoney(Number(v), currency)}
            labelStyle={{ color: "var(--color-text-muted)" }}
          />
          <ReferenceLine
            y={purchasePrice}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 4"
            label={{
              value: "Себестоимость",
              position: "insideTopRight",
              fill: "var(--color-text-muted)",
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-primary)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
