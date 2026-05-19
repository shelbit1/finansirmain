"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "checking" | "confirmed" | "pending" | "error";

/**
 * При открытии страницы /billing/success дёргает /api/billing/payments/[orderId]/sync
 * и обновляет страницу. Это страхует от случая, когда webhook от T-Bank не пришёл.
 */
export function SuccessSync({
  orderId,
  initiallyConfirmed,
}: {
  orderId: string;
  initiallyConfirmed: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(
    initiallyConfirmed ? "confirmed" : "checking",
  );
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (initiallyConfirmed) return;

    let cancelled = false;
    const sync = async (attempt: number) => {
      try {
        const res = await fetch(
          `/api/billing/payments/${encodeURIComponent(orderId)}/sync`,
          { method: "POST" },
        );
        const data = (await res.json().catch(() => null)) as
          | { ok: boolean; status?: string; error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Не удалось проверить статус");
        }
        if (data.status === "CONFIRMED") {
          setStatus("confirmed");
          router.refresh();
          return;
        }
        if (attempt < 4) {
          setAttempts(attempt + 1);
          setTimeout(() => sync(attempt + 1), 2000);
        } else {
          setStatus("pending");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка");
        setStatus("error");
      }
    };

    sync(0);
    return () => {
      cancelled = true;
    };
  }, [orderId, initiallyConfirmed, router]);

  if (status === "confirmed") return null;

  return (
    <div className="mt-4 text-xs text-text-muted">
      {status === "checking" && (
        <>Проверяем статус платежа в Т-Банке… {attempts > 0 && `(${attempts})`}</>
      )}
      {status === "pending" && (
        <>
          Платёж пока в обработке у банка. Обновите страницу через минуту или
          вернитесь к «Подписке» — статус обновится автоматически.
        </>
      )}
      {status === "error" && (
        <span className="text-expense">
          Не удалось проверить статус: {error}
        </span>
      )}
    </div>
  );
}
