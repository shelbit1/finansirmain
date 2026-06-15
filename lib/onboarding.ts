import "server-only";
import { Prisma } from "@prisma/client";
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

export type ProvisionUserInput = {
  /** UUID пользователя из Supabase Auth (`auth.users.id`). */
  id: string;
  email: string;
  name?: string | null;
  marketingConsent?: boolean;
  consentAcceptedAt?: Date | null;
};

/**
 * Идемпотентно создаёт профиль `public.User` для пользователя Supabase Auth
 * и засевает стартовые данные (счёт, категории, пробную подписку).
 *
 * Безопасно вызывать повторно: если профиль уже есть — дефолты не пересоздаются.
 */
export async function provisionUser(input: ProvisionUserInput): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (existing) return;

  // Создание профиля служит замком от гонки: при параллельных запросах
  // (например, layout и page рендерятся одновременно) только один из них
  // реально создаёт строку и засевает дефолты. Остальные ловят P2002 и выходят,
  // не пытаясь повторно создать подписку/счёт.
  try {
    await prisma.user.create({
      data: {
        id: input.id,
        email: input.email,
        name: input.name ?? null,
        consentAcceptedAt: input.consentAcceptedAt ?? new Date(),
        marketingConsent: input.marketingConsent ?? false,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return;
    }
    throw e;
  }

  await seedDefaultsForUser(input.id);
}

/** Создаёт стартовый счёт, категории и пробную подписку для пользователя. */
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
