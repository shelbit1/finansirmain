import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { tbankGetState } from "@/lib/tbank";
import { applyTbankStatusToPayment } from "@/lib/billing";

/**
 * Принудительно сверить статус нашей записи Payment с T-Bank через GetState.
 * Используется на странице /billing/success и кнопкой «Проверить статус» в
 * истории платежей — на случай, если webhook от T-Bank не пришёл.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const userId = await requireUserId();
  const { orderId } = await ctx.params;

  const payment = await prisma.payment.findFirst({
    where: { orderId, userId },
  });
  if (!payment) {
    return NextResponse.json(
      { ok: false, error: "Платёж не найден" },
      { status: 404 },
    );
  }

  if (!payment.tbankPaymentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "У платежа нет PaymentId от Т-Банка — нечего сверять",
      },
      { status: 400 },
    );
  }

  let stateRes;
  try {
    stateRes = await tbankGetState({ paymentId: payment.tbankPaymentId });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Не удалось запросить статус",
      },
      { status: 502 },
    );
  }

  const { payment: updated, justConfirmed } = await applyTbankStatusToPayment({
    payment,
    tbankStatus: stateRes.Status,
    errorCode: stateRes.ErrorCode,
    errorMessage: stateRes.Message ?? stateRes.Details,
  });

  return NextResponse.json({
    ok: true,
    status: updated.status,
    tbankStatus: updated.tbankStatus,
    justConfirmed,
  });
}
