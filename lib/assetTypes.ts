import type { AssetType } from "@prisma/client";

/**
 * Видимые в UI типы актива. В БД enum `AssetType` шире (исторические значения),
 * но для пользователя в интерфейсе показываем только эти три категории.
 */
export type AssetCategory = "REAL_ESTATE" | "VEHICLE" | "OTHER";

export const ASSET_CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "REAL_ESTATE", label: "Недвижимость" },
  { id: "VEHICLE", label: "Транспорт" },
  { id: "OTHER", label: "Прочее" },
];

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  REAL_ESTATE: "Недвижимость",
  VEHICLE: "Транспорт",
  OTHER: "Прочее",
};

/** Сводит любое значение enum к одной из трёх видимых категорий. */
export function assetCategory(type: AssetType): AssetCategory {
  if (type === "REAL_ESTATE") return "REAL_ESTATE";
  if (type === "VEHICLE") return "VEHICLE";
  return "OTHER";
}

/** Человеко-читаемая метка типа актива для UI. */
export function assetTypeLabel(type: AssetType): string {
  return CATEGORY_LABEL[assetCategory(type)];
}
