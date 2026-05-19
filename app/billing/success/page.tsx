import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SuccessSync } from "@/components/app/billing/SuccessSync";

export const metadata = {
  title: "Оплата получена — Финансыр",
  robots: "noindex",
};

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await readSession();
  if (!session?.userId) redirect("/login");

  const { orderId } = await searchParams;
  const payment = orderId
    ? await prisma.payment.findFirst({
        where: { orderId, userId: session.userId },
        select: { status: true, amount: true },
      })
    : null;

  const isConfirmed = payment?.status === "CONFIRMED";

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-6 sm:p-8 text-center">
        {isConfirmed ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-income/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-income" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">
              Оплата получена
            </h1>
            <p className="text-text-muted text-sm">
              Подписка продлена на 1 месяц. Спасибо, что выбрали «Финансыр»!
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-debt-get/10 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-debt-get" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">
              Платёж обрабатывается
            </h1>
            <p className="text-text-muted text-sm">
              Мы ждём подтверждение от банка. Обычно это занимает меньше минуты —
              обновите страницу через пару секунд или вернитесь к «Подписке».
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <Link href="/dashboard" className="btn btn-primary flex-1">
            На дашборд
          </Link>
          <Link href="/billing" className="btn btn-ghost flex-1">
            К подписке
          </Link>
        </div>

        {orderId && (
          <SuccessSync
            orderId={orderId}
            initiallyConfirmed={isConfirmed}
          />
        )}
      </div>
    </div>
  );
}
