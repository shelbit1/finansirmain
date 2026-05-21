import type { TransactionType } from "@prisma/client";
import { ArrowDown, ArrowLeftRight, ArrowUp, Coins, HandCoins } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

export const DEBT_TYPES = [
  "DEBT_TAKE",
  "DEBT_RETURN",
  "DEBT_GIVE",
  "DEBT_RECEIVE",
] as const satisfies readonly TransactionType[];

export type DebtType = (typeof DEBT_TYPES)[number];

export function isDebtType(t: TransactionType): t is DebtType {
  return (DEBT_TYPES as readonly TransactionType[]).includes(t);
}

export const DEBT_LABELS: Record<DebtType, string> = {
  DEBT_TAKE: "Я взял в долг",
  DEBT_RETURN: "Я вернул долг",
  DEBT_GIVE: "У меня взяли в долг",
  DEBT_RECEIVE: "Мне вернули долг",
};

export const DEBT_SHORT_LABELS: Record<DebtType, string> = {
  DEBT_TAKE: "Взял в долг",
  DEBT_RETURN: "Вернул долг",
  DEBT_GIVE: "Дал в долг",
  DEBT_RECEIVE: "Получил долг",
};

/** Знак для суммы при отображении в списке операций. */
export function debtSign(t: DebtType): "+" | "−" {
  return t === "DEBT_TAKE" || t === "DEBT_RECEIVE" ? "+" : "−";
}

/** Цвет: оранжевый = долги, где я должен; голубой = где мне должны. */
export function debtColor(t: DebtType): string {
  return t === "DEBT_TAKE" || t === "DEBT_RETURN"
    ? "var(--color-debt-owe)"
    : "var(--color-debt-get)";
}

export type TransactionTypeConfig = {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
  sign: "+" | "−" | "";
  label: string;
};

const BASE_CONFIG: Record<
  "INCOME" | "EXPENSE" | "TRANSFER" | "ASSET_BUY",
  TransactionTypeConfig
> = {
  INCOME: { icon: ArrowDown, color: "var(--color-income)", sign: "+", label: "Доход" },
  EXPENSE: { icon: ArrowUp, color: "var(--color-expense)", sign: "−", label: "Расход" },
  TRANSFER: {
    icon: ArrowLeftRight,
    color: "var(--color-transfer)",
    sign: "",
    label: "Перемещение",
  },
  ASSET_BUY: {
    icon: Coins,
    color: "var(--color-asset)",
    sign: "−",
    label: "Покупка актива",
  },
};

export function getTransactionTypeConfig(t: TransactionType): TransactionTypeConfig {
  if (isDebtType(t)) {
    return {
      icon: HandCoins,
      color: debtColor(t),
      sign: debtSign(t),
      label: DEBT_LABELS[t],
    };
  }
  return BASE_CONFIG[t as "INCOME" | "EXPENSE" | "TRANSFER" | "ASSET_BUY"];
}
