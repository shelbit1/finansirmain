"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/billing/payments/${encodeURIComponent(orderId)}/sync`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Не удалось проверить статус");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Проверяем…" : "Проверить статус"}
      </button>
      {error && <span className="text-[11px] text-expense">{error}</span>}
    </div>
  );
}
