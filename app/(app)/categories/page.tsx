import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoriesManager } from "@/components/app/categories/CategoriesManager";

export const metadata = { title: "Категории — Финансыр" };

export default async function CategoriesPage() {
  const userId = await requireUserId();
  const [income, expense] = await Promise.all([
    prisma.incomeCategory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Категории"
        subtitle="Группируйте операции по статьям доходов и расходов"
      />
      <CategoriesManager
        income={income.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
        expense={expense.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
      />
    </>
  );
}
