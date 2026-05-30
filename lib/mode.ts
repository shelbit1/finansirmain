export type AppMode = "personal" | "rentier" | "business";

/**
 * Источник правды для режимов приложения. Используется в шапке, сайдбаре и
 * нижней навигации, чтобы не дублировать список лейблов и маршрутов.
 */
export const APP_MODES: ReadonlyArray<{
  id: AppMode;
  label: string;
  dashboardHref: string;
}> = [
  { id: "personal", label: "Личное", dashboardHref: "/dashboard" },
  { id: "rentier", label: "Рантье", dashboardHref: "/rentier/dashboard" },
  { id: "business", label: "Бизнес", dashboardHref: "/business/dashboard" },
];

export function getModeFromPath(pathname: string): AppMode {
  if (pathname === "/rentier" || pathname.startsWith("/rentier/")) return "rentier";
  if (pathname === "/business" || pathname.startsWith("/business/")) return "business";
  return "personal";
}
