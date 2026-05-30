import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateShortFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

export function formatMoney(value: number | string, currency: string = "RUB"): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (currency === "RUB") return rubFormatter.format(num);
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${numberFormatter.format(num)} ${currency}`;
  }
}

/** Компактный формат без копеек: «3 млн», «100 тыс», иначе целое число. */
export function formatMoneyCompact(value: number | string): string {
  const num = Math.round(typeof value === "string" ? Number(value) : value);
  const abs = Math.abs(num);

  const formatUnit = (amount: number, unit: "млн" | "тыс") => {
    const rounded = Math.round(amount * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${text} ${unit}`;
  };

  if (abs >= 1_000_000) return formatUnit(num / 1_000_000, "млн");
  if (abs >= 1_000) return formatUnit(num / 1_000, "тыс");
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(num);
}

/** Компактный процент без лишних нулей: «12%», «8,5%». */
export function formatPercentCompact(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  const rounded = Math.round(num * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `${text}%`;
}

export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return numberFormatter.format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateShortFormatter.format(d);
}

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Возвращает дату в формате `YYYY-MM-DD` по локальному календарю.
 * Используется для `<input type="date">` и для построения параметров URL
 * (например, в фильтрах отчётов). Через `toISOString()` нельзя — это даст
 * UTC-дату, что в часовых поясах с положительным смещением (например, МСК)
 * сдвигает полуночные даты на сутки назад.
 */
export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export function percentChange(current: number, base: number): number {
  if (base === 0) return 0;
  return ((current - base) / base) * 100;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
