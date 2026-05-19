import "server-only";
import { prisma } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/billing";

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Зарплата", icon: "💼", color: "#22C55E" },
  { name: "Фриланс", icon: "💻", color: "#10B981" },
  { name: "Подарки", icon: "🎁", color: "#84CC16" },
  { name: "Дивиденды", icon: "📈", color: "#16A34A" },
  { name: "Прочее", icon: "💰", color: "#A3E635" },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Продукты", icon: "🛒", color: "#EF4444" },
  { name: "Кафе и рестораны", icon: "🍽️", color: "#F97316" },
  { name: "Транспорт", icon: "🚗", color: "#F59E0B" },
  { name: "Жильё", icon: "🏠", color: "#DC2626" },
  { name: "Развлечения", icon: "🎬", color: "#EC4899" },
  { name: "Здоровье", icon: "💊", color: "#06B6D4" },
  { name: "Одежда", icon: "👕", color: "#8B5CF6" },
  { name: "Прочее", icon: "📦", color: "#6B7280" },
];

export async function seedDefaultsForUser(userId: string): Promise<void> {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  await prisma.$transaction([
    prisma.account.create({
      data: {
        userId,
        name: "Наличные",
        currency: "RUB",
        balance: 0,
        icon: "💵",
        color: "#22C55E",
      },
    }),
    prisma.incomeCategory.createMany({
      data: DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, userId })),
    }),
    prisma.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, userId })),
    }),
    prisma.subscription.create({
      data: {
        userId,
        status: "TRIALING",
        trialEndsAt,
      },
    }),
  ]);
}
