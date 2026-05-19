import { TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddAssetButton,
  AssetsManager,
  type AssetWithHistory,
} from "@/components/app/assets/AssetsManager";
import { decimalToNumber, formatMoney, percentChange } from "@/lib/utils";

export const metadata = { title: "Активы — Финансыр" };

export default async function AssetsPage() {
  const userId = await requireUserId();
  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { valueHistory: { orderBy: { date: "asc" } } },
  });

  const dto: AssetWithHistory[] = assets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    purchasePrice: decimalToNumber(a.purchasePrice),
    currentValue: decimalToNumber(a.currentValue),
    currency: a.currency,
    purchaseDate: a.purchaseDate?.toISOString() ?? null,
    quantity: a.quantity ? decimalToNumber(a.quantity) : null,
    unit: a.unit,
    description: a.description,
    valueHistory: a.valueHistory.map((v) => ({
      id: v.id,
      value: decimalToNumber(v.value),
      date: v.date.toISOString(),
      note: v.note,
    })),
  }));

  const totalValue = dto.reduce((s, a) => s + a.currentValue, 0);
  const totalCost = dto.reduce((s, a) => s + a.purchasePrice, 0);
  const change = totalValue - totalCost;
  const pct = percentChange(totalValue, totalCost);
  const positive = change >= 0;

  return (
    <>
      <PageHeader
        title="Активы"
        subtitle="Личный портфель: недвижимость, авто, акции, крипта и прочее"
        action={<AddAssetButton />}
      />

      {dto.length > 0 && (
        <div className="card p-4 sm:p-5 mb-5 grid sm:grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Стоимость портфеля</p>
            <p className="font-display text-2xl sm:text-3xl font-bold tnum truncate">
              {formatMoney(totalValue, "RUB")}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Себестоимость</p>
            <p className="font-display text-2xl sm:text-3xl font-bold tnum text-text-muted truncate">
              {formatMoney(totalCost, "RUB")}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Прирост</p>
            <p
              className="font-display text-2xl sm:text-3xl font-bold tnum inline-flex items-center gap-2 max-w-full"
              style={{ color: positive ? "var(--color-income)" : "var(--color-expense)" }}
            >
              {positive ? (
                <TrendingUp className="w-5 h-5 shrink-0" />
              ) : (
                <TrendingDown className="w-5 h-5 shrink-0" />
              )}
              <span className="truncate">
                {positive ? "+" : "−"}
                {formatMoney(Math.abs(change), "RUB")}
              </span>
            </p>
            <p
              className="text-sm font-medium tnum"
              style={{ color: positive ? "var(--color-income)" : "var(--color-expense)" }}
            >
              {positive ? "+" : "−"}
              {Math.abs(pct).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <AssetsManager assets={dto} />
    </>
  );
}
