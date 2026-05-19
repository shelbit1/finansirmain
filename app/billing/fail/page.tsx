import Link from "next/link";
import { XCircle } from "lucide-react";
import { readSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Оплата не прошла — Финансыр",
  robots: "noindex",
};

export default async function BillingFailPage() {
  const session = await readSession();
  if (!session?.userId) redirect("/login");

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-expense/10 flex items-center justify-center mb-4">
          <XCircle className="w-7 h-7 text-expense" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">
          Оплата не прошла
        </h1>
        <p className="text-text-muted text-sm">
          Похоже, что банк отклонил операцию. Это могло произойти из-за
          недостатка средств, ограничений банка или неверных реквизитов карты.
          Попробуйте ещё раз или используйте другую карту.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <Link href="/billing" className="btn btn-primary flex-1">
            Попробовать снова
          </Link>
          <Link href="/dashboard" className="btn btn-ghost flex-1">
            На дашборд
          </Link>
        </div>
      </div>
    </div>
  );
}
