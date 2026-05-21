"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

export const INSTRUCTION_VIDEO_URL =
  "https://rutube.ru/video/25cc4dc8d209a6791f6a4f752aaaa44b/";

const SIDEBAR_WIDTH = "w-64";

function HeaderToolbar({
  userName,
  userEmail,
  showMobileLogo,
}: {
  userName: string;
  userEmail: string;
  showMobileLogo?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const initials = userName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-1 items-center justify-between gap-3 min-w-0 h-full px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {showMobileLogo && (
          <Link
            href="/dashboard"
            className="font-display text-lg font-semibold tracking-tight shrink-0"
          >
            Финансыр
          </Link>
        )}
        <a
          href={INSTRUCTION_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-bg rounded-lg transition-colors shrink-0"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Инструкция</span>
        </a>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Link
          href="/settings"
          aria-label="Настройки"
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
            settingsActive
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:text-text hover:bg-bg",
          )}
        >
          <Settings className="w-4.5 h-4.5" />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-bg transition-colors",
              menuOpen && "bg-bg",
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span
              className="w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0"
              aria-hidden
            >
              {initials || "?"}
            </span>
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-text-muted shrink-0 transition-transform",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-56 card shadow-lg border border-border py-1 z-50"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-text-muted truncate">{userEmail}</p>
              </div>
              <form action={logoutAction} className="p-1">
                <button
                  type="submit"
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-expense hover:bg-bg rounded-lg"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Выйти
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppHeader({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  return (
    <>
      {/* Десктоп: одна полоса на всю ширину — линия под шапкой и вертикаль в углу без смещения */}
      <header className="hidden md:flex sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-surface">
        <div className={cn("shrink-0 h-full flex items-center px-5 border-r border-border", SIDEBAR_WIDTH)}>
          <Link href="/dashboard" className="font-display text-xl font-semibold tracking-tight">
            Финансыр
          </Link>
        </div>
        <HeaderToolbar userName={userName} userEmail={userEmail} />
      </header>

      {/* Мобильный */}
      <header className="md:hidden sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-surface/95 backdrop-blur-sm">
        <HeaderToolbar
          userName={userName}
          userEmail={userEmail}
          showMobileLogo
        />
      </header>
    </>
  );
}
