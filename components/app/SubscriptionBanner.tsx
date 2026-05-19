import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { SubscriptionView } from "@/lib/billing";

export function SubscriptionBanner({ view }: { view: SubscriptionView }) {
  if (view.expired) {
    return (
      <div className="rounded-xl border border-expense/30 bg-expense/8 px-4 py-3 flex items-start gap-3 mb-4 sm:mb-5">
        <AlertTriangle className="w-5 h-5 text-expense shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Подписка истекла</p>
          <p className="text-xs text-text-muted mt-0.5">
            Чтобы вернуть доступ ко всем разделам — оплатите 500 ₽ за месяц.
          </p>
        </div>
        <Link href="/billing" className="btn btn-primary h-9 px-3 text-sm shrink-0">
          Оплатить
        </Link>
      </div>
    );
  }

  if (view.daysLeft !== null && view.daysLeft <= 3) {
    const label =
      view.status === "TRIALING"
        ? `Пробный период заканчивается через ${view.daysLeft} ${plural(view.daysLeft)}`
        : `Подписка заканчивается через ${view.daysLeft} ${plural(view.daysLeft)}`;
    return (
      <div className="rounded-xl border border-debt-owe/30 bg-debt-owe/8 px-4 py-3 flex items-start gap-3 mb-4 sm:mb-5">
        <Clock className="w-5 h-5 text-debt-owe shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Продлите подписку, чтобы не потерять доступ к сервису.
          </p>
        </div>
        <Link href="/billing" className="btn btn-primary h-9 px-3 text-sm shrink-0">
          Продлить
        </Link>
      </div>
    );
  }

  return null;
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
