import { HandCoins } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { DebtDetail } from "@/lib/balanceHistoryTypes";

export function DebtsBreakdown({
  receivables,
  liabilities,
}: {
  receivables: DebtDetail[];
  liabilities: DebtDetail[];
}) {
  if (receivables.length === 0 && liabilities.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Column
        title="Мне должны"
        color="var(--color-debt-get)"
        items={receivables}
      />
      <Column
        title="Я должен"
        color="var(--color-debt-owe)"
        items={liabilities}
      />
    </div>
  );
}

function Column({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: DebtDetail[];
}) {
  // Считаем итог по основной валюте (RUB), как и для активов/счетов.
  const totalRub = items
    .filter((d) => d.currency === "RUB")
    .reduce((s, d) => s + d.remaining, 0);
  const otherCurrencies = Array.from(
    new Set(items.filter((d) => d.currency !== "RUB").map((d) => d.currency)),
  );

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-base font-semibold flex items-center gap-2">
          <HandCoins className="w-4 h-4" style={{ color }} />
          {title}
        </h3>
        {items.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-muted">Итого</div>
            <div
              className="font-display text-base font-bold tnum"
              style={{ color }}
            >
              {formatMoney(totalRub, "RUB")}
            </div>
            {otherCurrencies.length > 0 && (
              <div className="text-[10px] text-text-muted">
                + {otherCurrencies.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Пусто</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((d, i) => (
            <li
              key={`${d.personName}-${i}`}
              className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
            >
              <span className="truncate text-sm">{d.personName}</span>
              <span
                className="font-semibold tnum text-sm shrink-0"
                style={{ color }}
              >
                {formatMoney(d.remaining, d.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
