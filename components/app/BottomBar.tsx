"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarCheck,
  BarChart3,
  HandCoins,
  Coins,
  Scale,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessTier } from "@/lib/access";

type Tab = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  paid?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  { href: "/plans", label: "Планы", icon: CalendarCheck, paid: true },
  { href: "/reports", label: "Дох. − Расх.", icon: BarChart3 },
  { href: "/balance", label: "Баланс", icon: Scale, paid: true },
  { href: "/debts", label: "Долги", icon: HandCoins, paid: true },
  { href: "/assets", label: "Активы", icon: Coins, paid: true },
];

export function BottomBar({ tier }: { tier: AccessTier }) {
  const pathname = usePathname();
  const isFree = tier === "FREE";

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border safe-area">
      <ul className="grid grid-cols-7">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const locked = isFree && tab.paid;
          const href = locked ? "/billing" : tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={href}
                title={locked ? "Доступно в платной подписке" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium leading-tight",
                  active ? "text-primary" : "text-text-muted",
                )}
              >
                <tab.icon className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full px-1">{tab.label}</span>
                {locked && (
                  <Lock className="absolute top-1 right-1 w-2.5 h-2.5 opacity-50" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
