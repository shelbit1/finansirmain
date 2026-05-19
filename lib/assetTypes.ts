import type { AssetType } from "@prisma/client";

export const ASSET_TYPES: Record<AssetType, { label: string; emoji: string }> = {
  REAL_ESTATE: { label: "Недвижимость", emoji: "🏠" },
  VEHICLE: { label: "Транспорт", emoji: "🚗" },
  STOCKS: { label: "Акции / Фонды", emoji: "📈" },
  CRYPTO: { label: "Криптовалюта", emoji: "🪙" },
  DEPOSIT: { label: "Вклад", emoji: "🏦" },
  BUSINESS: { label: "Бизнес", emoji: "💼" },
  PRECIOUS: { label: "Драгметаллы", emoji: "💎" },
  OTHER: { label: "Прочее", emoji: "📦" },
};

export const ASSET_TYPE_LIST = Object.entries(ASSET_TYPES) as [
  AssetType,
  { label: string; emoji: string },
][];
