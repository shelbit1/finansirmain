import type { TransactionType } from "@prisma/client";

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
