import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createAssetWithHistory(
  userId: string,
  data: {
    name: string;
    type: Prisma.EnumAssetTypeFieldUpdateOperationsInput["set"] | string;
    purchasePrice: number;
    currentValue: number;
    currency: string;
    purchaseDate?: Date | null;
    quantity?: number | null;
    unit?: string;
    description?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        userId,
        name: data.name,
        type: data.type as Prisma.AssetCreateInput["type"],
        purchasePrice: data.purchasePrice,
        currentValue: data.currentValue,
        currency: data.currency,
        purchaseDate: data.purchaseDate ?? null,
        quantity: data.quantity ?? null,
        unit: data.unit,
        description: data.description,
      },
    });

    await tx.assetValueHistory.create({
      data: {
        assetId: asset.id,
        userId,
        value: data.currentValue,
        date: data.purchaseDate ?? new Date(),
        note: "Начальная стоимость",
      },
    });

    return asset;
  });
}

export async function addAssetValue(
  userId: string,
  assetId: string,
  data: { value: number; date: Date; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.userId !== userId) throw new Error("Актив не найден");

    await tx.assetValueHistory.create({
      data: { assetId, userId, value: data.value, date: data.date, note: data.note },
    });

    return tx.asset.update({
      where: { id: assetId },
      data: { currentValue: data.value },
    });
  });
}

export async function deleteAssetValue(userId: string, assetId: string, valueId: string) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.userId !== userId) throw new Error("Актив не найден");

    const value = await tx.assetValueHistory.findUnique({ where: { id: valueId } });
    if (!value || value.assetId !== assetId) throw new Error("Запись истории не найдена");

    await tx.assetValueHistory.delete({ where: { id: valueId } });

    const latest = await tx.assetValueHistory.findFirst({
      where: { assetId },
      orderBy: { date: "desc" },
    });

    if (latest) {
      await tx.asset.update({
        where: { id: assetId },
        data: { currentValue: latest.value },
      });
    }

    return { ok: true };
  });
}
