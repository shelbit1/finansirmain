"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarCheck,
  BarChart3,
  HandCoins,
  Coins,
  Scale,
  Lock,
  MoreHorizontal,
  Wallet,
  Tag,
  Building2,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessTier } from "@/lib/access";
import { getModeFromPath, type AppMode } from "@/lib/mode";

type Tab = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  paid?: boolean;
};

const PERSONAL_TABS: Tab[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  { href: "/reports", label: "Отчёт", icon: BarChart3 },
  { href: "/plans", label: "Планы", icon: CalendarCheck, paid: true },
  { href: "/balance", label: "Баланс", icon: Scale, paid: true },
  { href: "/debts", label: "Долги", icon: HandCoins, paid: true },
  { href: "/assets", label: "Активы", icon: Coins, paid: true },
  { href: "/accounts", label: "Счета", icon: Wallet },
  { href: "/categories", label: "Категории", icon: Tag },
];

const RENTIER_TABS: Tab[] = [
  { href: "/rentier/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/rentier/properties", label: "Объекты", icon: Building2 },
  { href: "/rentier/portfolio", label: "Портфель", icon: PieChart },
];

const BUSINESS_TABS: Tab[] = [
  { href: "/business/dashboard", label: "Главная", icon: LayoutDashboard },
];

const TABS_BY_MODE: Record<AppMode, Tab[]> = {
  personal: PERSONAL_TABS,
  rentier: RENTIER_TABS,
  business: BUSINESS_TABS,
};

const VISIBLE_COUNT = 4;

export function BottomBar({ tier }: { tier: AccessTier }) {
  const pathname = usePathname();
  const isFree = tier === "FREE";
  const mode = getModeFromPath(pathname);
  const tabs = TABS_BY_MODE[mode];
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Overflow «Ещё» только в «Личном» — там много пунктов меню.
  const needsOverflow = mode === "personal" && tabs.length > VISIBLE_COUNT + 1;
  const visible = needsOverflow ? tabs.slice(0, VISIBLE_COUNT) : tabs;
  const overflow = needsOverflow ? tabs.slice(VISIBLE_COUNT) : [];
  const overflowActive = overflow.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/"),
  );

  const renderTab = (tab: Tab) => {
    const active =
      pathname === tab.href || pathname.startsWith(tab.href + "/");
    const locked = isFree && tab.paid;
    const href = locked ? "/billing" : tab.href;
    return (
      <Link
        href={href}
        title={locked ? "Доступно в платной подписке" : undefined}
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[56px] text-[10px] font-medium leading-tight",
          active ? "text-primary" : "text-text-muted",
        )}
      >
        <tab.icon className="w-5 h-5 shrink-0" />
        <span className="truncate max-w-full px-1">{tab.label}</span>
        {locked && (
          <Lock className="absolute top-1 right-2 w-2.5 h-2.5 opacity-50" />
        )}
      </Link>
    );
  };

  const columns = visible.length + (needsOverflow ? 1 : 0);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border safe-area">
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {visible.map((tab) => (
          <li key={tab.href}>{renderTab(tab)}</li>
        ))}
        {needsOverflow && (
          <li className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[56px] text-[10px] font-medium leading-tight",
                overflowActive || moreOpen
                  ? "text-primary"
                  : "text-text-muted",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
              <span>Ещё</span>
            </button>

            {moreOpen && (
              <div
                role="menu"
                className="absolute right-2 bottom-full mb-2 w-52 card shadow-lg border border-border py-1"
              >
                {overflow.map((tab) => {
                  const active =
                    pathname === tab.href ||
                    pathname.startsWith(tab.href + "/");
                  const locked = isFree && tab.paid;
                  const href = locked ? "/billing" : tab.href;
                  return (
                    <Link
                      key={tab.href}
                      href={href}
                      title={
                        locked ? "Доступно в платной подписке" : undefined
                      }
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm",
                        active
                          ? "text-primary bg-primary/5"
                          : "text-text hover:bg-bg",
                      )}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                      {locked && (
                        <Lock className="w-3.5 h-3.5 text-text-muted opacity-70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
}
