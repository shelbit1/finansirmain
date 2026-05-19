import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapTbankStatus, verifyTbankNotification } from "@/lib/tbank";
import { extendSubscriptionAfterPayment } from "@/lib/billing";

/**
 * Уведомление T-Bank. Если возвращаем тело "OK" (text/plain) — T-Bank считает,
 * что мерчант успешно обработал событие и не повторяет рассылку.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse("BAD_JSON", { status: 400 });
  }

  if (!verifyTbankNotification(body)) {
    return new NextResponse("INVALID_TOKEN", { status: 401 });
  }

  const orderId = body.OrderId ? String(body.OrderId) : null;
  const tbankPaymentId = body.PaymentId ? String(body.PaymentId) : null;
  const status = body.Status ? String(body.Status) : null;
  const success = body.Success === true || body.Success === "true";
  const errorCode = body.ErrorCode ? String(body.ErrorCode) : null;
  const errorMessage = body.Message ? String(body.Message) : null;

  if (!orderId) {
    return new NextResponse("NO_ORDER_ID", { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) {
    return new NextResponse("NO_PAYMENT", { status: 404 });
  }

  const mapped = mapTbankStatus(status);
  const wasConfirmed = payment.status === "CONFIRMED";

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: mapped,
      tbankStatus: status,
      tbankPaymentId: tbankPaymentId ?? payment.tbankPaymentId,
      paidAt: mapped === "CONFIRMED" && !payment.paidAt ? new Date() : payment.paidAt,
      errorCode: errorCode ?? payment.errorCode,
      errorMessage:
        errorCode && errorCode !== "0" ? errorMessage : payment.errorMessage,
    },
  });

  // При первом CONFIRMED продлеваем подписку.
  if (mapped === "CONFIRMED" && !wasConfirmed && success) {
    await extendSubscriptionAfterPayment(payment.userId, payment.periodMonths);
  }

  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
