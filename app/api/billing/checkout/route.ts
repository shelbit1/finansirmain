import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { tbankInit } from "@/lib/tbank";
import {
  PLAN_PERIOD_MONTHS,
  PLAN_PRICE_KOPECKS,
  PLAN_PRICE_RUB,
} from "@/lib/billing";

function getBaseUrl(req: Request): string {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: PLAN_PRICE_RUB,
      currency: "RUB",
      status: "NEW",
      description: `Подписка «Финансыр» — ${PLAN_PERIOD_MONTHS} мес.`,
      periodMonths: PLAN_PERIOD_MONTHS,
      orderId: "", // заполним после генерации id
    },
  });

  // OrderId = id записи, чтобы webhook мог однозначно её найти.
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { orderId: payment.id },
  });

  const baseUrl = getBaseUrl(req);
  try {
    const initRes = await tbankInit({
      orderId: updated.orderId,
      amountKopecks: PLAN_PRICE_KOPECKS,
      description: updated.description ?? "Подписка «Финансыр»",
      successUrl: `${baseUrl}/billing/success?orderId=${updated.orderId}`,
      failUrl: `${baseUrl}/billing/fail?orderId=${updated.orderId}`,
      notificationUrl: `${baseUrl}/api/billing/webhook`,
      data: {
        userId,
        email: user.email,
      },
    });

    if (!initRes.Success || !initRes.PaymentURL) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          errorCode: initRes.ErrorCode,
          errorMessage: initRes.Message ?? initRes.Details,
          tbankStatus: initRes.Status,
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error: initRes.Message ?? initRes.Details ?? "Не удалось инициализировать платёж",
        },
        { status: 400 },
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        tbankPaymentId: initRes.PaymentId,
        tbankStatus: initRes.Status,
        paymentUrl: initRes.PaymentURL,
      },
    });

    return NextResponse.json({
      ok: true,
      paymentUrl: initRes.PaymentURL,
      orderId: updated.orderId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", errorMessage: message },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
