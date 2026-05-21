import type { AssetType, DebtDirection } from "@prisma/client";

export type Granularity = "day" | "week" | "month";

export type Period = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export type BalancePoint = {
  date: string;
  liquid: number;
  assets: number;
  receivables: number;
  liabilities: number;
  netWorth: number;
};

export type AccountBreakdown = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  balance: number;
  currency: string;
};

export type AssetBreakdownItem = {
  type: AssetType;
  label: string;
  emoji: string;
  totalValue: number;
  totalCost: number;
  count: number;
};

export type DebtDetail = {
  personName: string;
  remaining: number;
  currency: string;
  direction: DebtDirection;
};

export type BalanceCurrent = {
  liquid: number;
  assets: number;
  receivables: number;
  liabilities: number;
  netWorth: number;
  accountsBreakdown: AccountBreakdown[];
  assetsBreakdown: AssetBreakdownItem[];
  receivablesDetail: DebtDetail[];
  liabilitiesDetail: DebtDetail[];
};

export type BalanceChange = {
  amount: number;
  percent: number;
};

export type BalanceHistoryResponse = {
  points: BalancePoint[];
  current: BalanceCurrent;
  change: BalanceChange;
  range: { from: string; to: string; granularity: Granularity };
};
