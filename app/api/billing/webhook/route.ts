import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTbankNotification } from "@/lib/tbank";
import { applyTbankStatusToPayment } from "@/lib/billing";

/**
 * Уведомление T-Bank. Если возвращаем тело "OK" (text/plain) — T-Bank считает,
 * что мерчант успешно обработал событие и не повторяет рассылку.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    console.error("[tbank-webhook] BAD_JSON");
    return new NextResponse("BAD_JSON", { status: 400 });
  }

  console.log("[tbank-webhook] received", {
    OrderId: body.OrderId,
    PaymentId: body.PaymentId,
    Status: body.Status,
    Success: body.Success,
    ErrorCode: body.ErrorCode,
  });

  if (!verifyTbankNotification(body)) {
    console.error("[tbank-webhook] INVALID_TOKEN", { OrderId: body.OrderId });
    return new NextResponse("INVALID_TOKEN", { status: 401 });
  }

  const orderId = body.OrderId ? String(body.OrderId) : null;
  const tbankPaymentId = body.PaymentId ? String(body.PaymentId) : null;
  const status = body.Status ? String(body.Status) : null;
  const errorCode = body.ErrorCode ? String(body.ErrorCode) : null;
  const errorMessage = body.Message ? String(body.Message) : null;

  if (!orderId) {
    return new NextResponse("NO_ORDER_ID", { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) {
    console.error("[tbank-webhook] NO_PAYMENT", { orderId });
    return new NextResponse("NO_PAYMENT", { status: 404 });
  }

  await applyTbankStatusToPayment({
    payment,
    tbankStatus: status,
    tbankPaymentId,
    errorCode,
    errorMessage,
  });

  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
