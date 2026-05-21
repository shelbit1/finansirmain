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
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  { href: "/plans", label: "Планы", icon: CalendarCheck },
  { href: "/reports", label: "Дох. − Расх.", icon: BarChart3 },
  { href: "/balance", label: "Баланс", icon: Scale },
  { href: "/debts", label: "Долги", icon: HandCoins },
  { href: "/assets", label: "Активы", icon: Coins },
];

export function BottomBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border safe-area">
      <ul className="grid grid-cols-7">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[10px] font-medium leading-tight",
                  active ? "text-primary" : "text-text-muted",
                )}
              >
                <tab.icon className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full px-1">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
