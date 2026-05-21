import { formatMoney } from "@/lib/utils";

export function NetWorthHeader({ netWorth }: { netWorth: number }) {
  return (
    <div className="card p-5 sm:p-6 min-w-0">
      <div className="text-text-muted text-sm mb-1">Чистый капитал</div>
      <p
        className="font-display text-3xl sm:text-4xl font-bold tnum truncate"
        style={{
          color: netWorth < 0 ? "var(--color-expense)" : undefined,
        }}
      >
        {formatMoney(netWorth, "RUB")}
      </p>
    </div>
  );
}
