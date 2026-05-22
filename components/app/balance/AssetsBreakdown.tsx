import { Coins } from "lucide-react";
import { formatMoney, percentChange } from "@/lib/utils";
import type { AssetBreakdownItem } from "@/lib/balanceHistoryTypes";

export function AssetsBreakdown({ items }: { items: AssetBreakdownItem[] }) {
  if (items.length === 0) return null;
  const total = items.reduce((s, a) => s + a.totalValue, 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Coins className="w-4 h-4" style={{ color: "var(--color-asset)" }} />
          Активы по типам
        </h3>
        <div className="text-right">
          <div className="text-xs text-text-muted">Итого</div>
          <div
            className="font-display text-base sm:text-lg font-bold tnum"
            style={{ color: "var(--color-asset)" }}
          >
            {formatMoney(total, "RUB")}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((a) => {
          const share = total > 0 ? (a.totalValue / total) * 100 : 0;
          const pct = a.totalCost > 0 ? percentChange(a.totalValue, a.totalCost) : null;
          return (
            <div key={a.type}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{a.label}</span>
                  <span className="text-xs text-text-muted shrink-0">· {a.count}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tnum">
                    {formatMoney(a.totalValue, "RUB")}
                  </div>
                  {pct !== null && (
                    <div
                      className="text-xs tnum"
                      style={{
                        color:
                          pct >= 0 ? "var(--color-income)" : "var(--color-expense)",
                      }}
                    >
                      {pct >= 0 ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${share}%`,
                    background: "var(--color-asset)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
