"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
        Финансыр
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted truncate max-w-[100px]">{userName}</span>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Выйти"
            className="p-2 text-text-muted hover:text-expense rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
