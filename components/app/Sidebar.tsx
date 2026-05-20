"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  HandCoins,
  Coins,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  { href: "/plans", label: "Планы", icon: CalendarCheck },
  { href: "/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/accounts", label: "Счета", icon: Wallet },
  { href: "/categories", label: "Категории", icon: Tag },
  { href: "/debts", label: "Долги", icon: HandCoins },
  { href: "/assets", label: "Активы", icon: Coins },
  { href: "/billing", label: "Подписка", icon: CreditCard },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 h-dvh flex-col border-r border-border bg-surface">
      <div className="shrink-0 px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="font-display text-xl font-semibold tracking-tight">
          Финансыр
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-bg",
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="px-2 py-2">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-text-muted truncate">{userEmail}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-expense hover:bg-bg rounded-lg"
          >
            Выйти
          </button>
        </form>
      </div>
    </aside>
  );
}
