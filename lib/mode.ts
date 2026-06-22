export type AppMode = "personal" | "business";

export const APP_MODES: ReadonlyArray<{
  id: AppMode;
  label: string;
  dashboardHref: string;
}> = [
  { id: "personal", label: "Личное",  dashboardHref: "/dashboard" },
  { id: "business", label: "Бизнес",  dashboardHref: "/business/dashboard" },
];

export function getModeFromPath(pathname: string): AppMode {
  if (pathname === "/business" || pathname.startsWith("/business/")) return "business";
  return "personal";
}
