import { Coins, HandCoins, Wallet } from "lucide-react";
import { formatMoney, percentChange } from "@/lib/utils";
import type { BalanceCurrent } from "@/lib/balanceHistoryTypes";

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function BalanceSummaryCards({ current }: { current: BalanceCurrent }) {
  const assetsCost = current.assetsBreakdown.reduce((s, a) => s + a.totalCost, 0);
  const assetsPct = assetsCost > 0 ? percentChange(current.assets, assetsCost) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <Card
        label="Наличные и счета"
        value={current.liquid}
        color="var(--color-primary)"
        icon={Wallet}
        subtitle={plural(current.accountsBreakdown.length, "счёт", "счёта", "счетов")}
      />
      <Card
        label="Активы"
        value={current.assets}
        color="var(--color-asset)"
        icon={Coins}
        subtitle={plural(current.assetsBreakdown.length, "тип", "типа", "типов")}
        changePct={assetsPct}
      />
      <Card
        label="Мне должны"
        value={current.receivables}
        color="var(--color-debt-get)"
        icon={HandCoins}
        subtitle={plural(current.receivablesDetail.length, "долг", "долга", "долгов")}
      />
      <Card
        label="Я должен"
        value={current.liabilities}
        color="var(--color-debt-owe)"
        icon={HandCoins}
        subtitle={plural(current.liabilitiesDetail.length, "долг", "долга", "долгов")}
      />
    </div>
  );
}

function Card({
  label,
  value,
  color,
  icon: Icon,
  subtitle,
  changePct,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  subtitle?: string;
  changePct?: number | null;
}) {
  return (
    <div className="card p-3 sm:p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-text-muted text-xs sm:text-sm mb-1 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <span className="truncate">{label}</span>
      </div>
      <p
        className="font-display text-lg sm:text-2xl font-bold tnum truncate"
        style={{ color }}
      >
        {formatMoney(value, "RUB")}
      </p>
      {subtitle && (
        <p className="text-xs text-text-muted mt-1 truncate">{subtitle}</p>
      )}
      {changePct != null && (
        <p
          className="text-xs font-medium tnum mt-0.5"
          style={{
            color: changePct >= 0 ? "var(--color-income)" : "var(--color-expense)",
          }}
        >
          {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct).toFixed(1)}%
        </p>
      )}
    </div>
  );
}
