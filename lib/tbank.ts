import "server-only";
import crypto from "node:crypto";

export const TBANK_API_URL =
  process.env.TBANK_API_URL ?? "https://securepay.tinkoff.ru/v2";

export function getTbankCredentials() {
  const terminalKey = process.env.TBANK_TERMINAL_KEY;
  const password = process.env.TBANK_PASSWORD;
  if (!terminalKey || !password) {
    throw new Error(
      "T-Bank: не заданы TBANK_TERMINAL_KEY/TBANK_PASSWORD в окружении",
    );
  }
  return { terminalKey, password };
}

/**
 * Подписать запрос/уведомление по правилам T-Bank.
 *
 * Алгоритм:
 *  1. Собираем все root-параметры (примитивы: string/number/boolean).
 *  2. Исключаем Token, Receipt, DATA, Shops и т. п. сложные объекты.
 *  3. Добавляем Password.
 *  4. Сортируем по ключам по алфавиту.
 *  5. Конкатенируем значения.
 *  6. SHA-256 в hex.
 *
 * См. https://www.tbank.ru/kassa/dev/payments/#section/Token
 */
export function signTbankPayload(
  payload: Record<string, unknown>,
  password: string,
): string {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "Token") continue;
    if (value === null || value === undefined) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      flat[key] = String(value);
    }
  }
  flat.Password = password;

  const concatenated = Object.keys(flat)
    .sort()
    .map((k) => flat[k])
    .join("");

  return crypto.createHash("sha256").update(concatenated).digest("hex");
}

export type TbankInitInput = {
  orderId: string;
  /** Сумма в копейках */
  amountKopecks: number;
  description?: string;
  successUrl?: string;
  failUrl?: string;
  notificationUrl?: string;
  data?: Record<string, string>;
};

export type TbankInitResponse = {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
  PaymentURL?: string;
};

export async function tbankInit(
  input: TbankInitInput,
): Promise<TbankInitResponse> {
  const { terminalKey, password } = getTbankCredentials();

  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    Amount: input.amountKopecks,
    OrderId: input.orderId,
  };
  if (input.description) body.Description = input.description;
  if (input.successUrl) body.SuccessURL = input.successUrl;
  if (input.failUrl) body.FailURL = input.failUrl;
  if (input.notificationUrl) body.NotificationURL = input.notificationUrl;

  body.Token = signTbankPayload(body, password);

  if (input.data) body.DATA = input.data;

  const res = await fetch(`${TBANK_API_URL}/Init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`T-Bank Init: HTTP ${res.status}`);
  }
  return (await res.json()) as TbankInitResponse;
}

/**
 * Проверить подпись webhook-уведомления от T-Bank.
 * В body приходят все поля, включая Token. Считаем по тем же правилам и
 * сравниваем без учёта регистра.
 */
export function verifyTbankNotification(
  body: Record<string, unknown>,
): boolean {
  const { password } = getTbankCredentials();
  const incomingToken = String(body.Token ?? "");
  if (!incomingToken) return false;
  const calculated = signTbankPayload(body, password);
  return incomingToken.toLowerCase() === calculated.toLowerCase();
}

/** Перевести статус T-Bank в наш PaymentStatus. */
export function mapTbankStatus(
  status: string | undefined | null,
):
  | "NEW"
  | "FORM_SHOWED"
  | "AUTHORIZED"
  | "CONFIRMED"
  | "REJECTED"
  | "REFUNDED"
  | "CANCELED" {
  switch ((status ?? "").toUpperCase()) {
    case "NEW":
      return "NEW";
    case "FORM_SHOWED":
      return "FORM_SHOWED";
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "CONFIRMED":
      return "CONFIRMED";
    case "REFUNDED":
    case "PARTIAL_REFUNDED":
      return "REFUNDED";
    case "REJECTED":
    case "DEADLINE_EXPIRED":
    case "ATTEMPTS_EXPIRED":
      return "REJECTED";
    case "CANCELED":
      return "CANCELED";
    default:
      return "NEW";
  }
}
