"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
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
  Scale,
  ChevronRight,
  Mail,
  Phone,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessTier } from "@/lib/access";

type IconComponent = ComponentType<{ className?: string }>;

type NavItem = { href: string; label: string; icon: IconComponent; paid?: boolean };

type NavGroup = {
  id: string;
  label: string;
  icon: IconComponent;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV: NavEntry[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/transactions", label: "Операции", icon: ArrowLeftRight },
  {
    id: "reports",
    label: "Отчёты",
    icon: BarChart3,
    children: [
      { href: "/reports", label: "Доходы − Расходы", icon: ArrowLeftRight },
      { href: "/balance", label: "Баланс", icon: Scale, paid: true },
    ],
  },
  { href: "/assets", label: "Активы", icon: Coins, paid: true },
  { href: "/accounts", label: "Счета", icon: Wallet },
  { href: "/debts", label: "Долги", icon: HandCoins, paid: true },
  { href: "/plans", label: "Планы", icon: CalendarCheck, paid: true },
  { href: "/billing", label: "Подписка", icon: CreditCard },
  { href: "/categories", label: "Категории", icon: Tag },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ tier }: { tier: AccessTier }) {
  const isFree = tier === "FREE";
  const pathname = usePathname();
  const reportsActive =
    isActive(pathname, "/reports") || isActive(pathname, "/balance");
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  return (
    <aside className="hidden md:flex w-64 shrink-0 h-full flex-col border-r border-border bg-surface">
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry.children.some((c) => isActive(pathname, c.href));
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => setReportsOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    groupActive ? "text-text" : "text-text",
                    "hover:bg-bg",
                  )}
                >
                  <entry.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1 text-left">{entry.label}</span>
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-transform",
                      reportsOpen && "rotate-90",
                    )}
                  />
                </button>
                {reportsOpen && (
                  <div className="mt-0.5 pl-7 space-y-0.5">
                    {entry.children.map((child) => {
                      const active = isActive(pathname, child.href);
                      const locked = isFree && child.paid;
                      const href = locked ? "/billing" : child.href;
                      return (
                        <Link
                          key={child.href}
                          href={href}
                          title={locked ? "Доступно в платной подписке" : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-text-muted hover:bg-bg hover:text-text",
                          )}
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{child.label}</span>
                          {locked && <Lock className="w-3 h-3 shrink-0 opacity-60" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const active = isActive(pathname, entry.href);
          const locked = isFree && entry.paid;
          const href = locked ? "/billing" : entry.href;
          return (
            <Link
              key={entry.href}
              href={href}
              title={locked ? "Доступно в платной подписке" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                active ? "bg-primary/10 text-primary" : "text-text hover:bg-bg",
              )}
            >
              <entry.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{entry.label}</span>
              {locked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">
          Поддержка
        </p>
        <div className="space-y-1">
          <a
            href="tel:+79152153048"
            className="flex items-center gap-2 py-1.5 text-xs text-text-muted hover:text-text rounded-lg"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="tnum">+7 915 215-30-48</span>
          </a>
          <a
            href="mailto:e23091997@yandex.com"
            className="flex items-center gap-2 py-1.5 text-xs text-text-muted hover:text-text rounded-lg"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">e23091997@yandex.com</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
