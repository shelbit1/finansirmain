import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddPlanButton,
  PlansManager,
} from "@/components/app/plans/PlansManager";
import type { PlanDto } from "@/components/app/plans/PlanForm";
import { decimalToNumber } from "@/lib/utils";

export const metadata = { title: "Планы — Финансыр" };

export default async function PlansPage() {
  const userId = await requireActiveSubscription();

  const plans = await prisma.plan.findMany({
    where: { userId },
    orderBy: [
      { completed: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  const dto: PlanDto[] = plans.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    amount: decimalToNumber(p.amount),
    currency: p.currency,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    note: p.note,
    completed: p.completed,
  }));

  return (
    <>
      <PageHeader
        title="Планы"
        subtitle="Запланированные доходы и расходы — отмечайте галочкой по мере выполнения"
        action={<AddPlanButton />}
      />
      <PlansManager plans={dto} />
    </>
  );
}
