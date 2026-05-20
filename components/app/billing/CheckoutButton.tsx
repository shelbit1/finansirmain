"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { PLAN_PRICE_RUB } from "@/lib/planPricing";
import { formatMoney } from "@/lib/utils";

export function CheckoutButton({
  label = `Оплатить ${formatMoney(PLAN_PRICE_RUB)}`,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; paymentUrl?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.paymentUrl) {
        throw new Error(data?.error || "Не удалось создать платёж");
      }
      window.location.assign(data.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={className ?? "btn btn-primary inline-flex items-center gap-2 px-5"}
      >
        <CreditCard className="w-4 h-4" />
        {pending ? "Открываем оплату…" : label}
      </button>
      {error && (
        <p className="text-expense text-xs bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
