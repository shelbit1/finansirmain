"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";
const CONSENT_EVENT = "cookie-consent-change";

export type CookieConsent = "all" | "necessary";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "all" || v === "necessary" ? v : null;
}

export function setCookieConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = (value: CookieConsent) => {
    setCookieConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Согласие на использование файлов cookie"
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-5 z-50 max-w-2xl card p-4 sm:p-5 animate-slide-up shadow-card-hover"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm leading-snug flex-1 min-w-0">
          Мы используем cookie для работы сервиса и аналитики (Яндекс.Метрика).{" "}
          <Link href="/cookies" className="text-primary hover:underline">
            Подробнее →
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => accept("necessary")}
            className="btn btn-ghost h-10 px-3 text-sm whitespace-nowrap"
          >
            Только необходимые
          </button>
          <button
            type="button"
            onClick={() => accept("all")}
            className="btn btn-primary h-10 px-4 text-sm whitespace-nowrap"
          >
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}

export { CONSENT_EVENT, STORAGE_KEY };
