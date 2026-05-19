import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AddDebtButton,
  DebtsManager,
  type DebtWithPayments,
} from "@/components/app/debts/DebtsManager";
import { decimalToNumber, formatMoney } from "@/lib/utils";

export const metadata = { title: "Долги — Финансыр" };

export default async function DebtsPage() {
  const userId = await requireUserId();
  const debts = await prisma.debt.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { payments: { orderBy: { date: "desc" } } },
  });

  const dto: DebtWithPayments[] = debts.map((d) => ({
    id: d.id,
    direction: d.direction,
    personName: d.personName,
    amount: decimalToNumber(d.amount),
    currency: d.currency,
    dueDate: d.dueDate?.toISOString() ?? null,
    description: d.description,
    status: d.status,
    paidAmount: decimalToNumber(d.paidAmount),
    payments: d.payments.map((p) => ({
      id: p.id,
      amount: decimalToNumber(p.amount),
      date: p.date.toISOString(),
      note: p.note,
    })),
  }));

  const owed = dto
    .filter((d) => d.direction === "I_OWE" && d.status !== "CLOSED")
    .reduce((acc, d) => acc + (d.amount - d.paidAmount), 0);
  const credit = dto
    .filter((d) => d.direction === "OWED_TO_ME" && d.status !== "CLOSED")
    .reduce((acc, d) => acc + (d.amount - d.paidAmount), 0);
  const net = credit - owed;

  return (
    <>
      <PageHeader
        title="Долги"
        subtitle="Что вы должны и что должны вам"
        action={<AddDebtButton />}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <SummaryCard label="Я должен" value={owed} color="var(--color-debt-owe)" />
        <SummaryCard label="Мне должны" value={credit} color="var(--color-debt-get)" />
        <SummaryCard
          label="Чистый баланс"
          value={net}
          color={net >= 0 ? "var(--color-income)" : "var(--color-expense)"}
        />
      </div>

      <DebtsManager debts={dto} />
    </>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-3 sm:p-4 min-w-0">
      <p className="text-xs sm:text-sm text-text-muted truncate">{label}</p>
      <p
        className="font-display text-lg sm:text-2xl font-bold tnum mt-0.5 truncate"
        style={{ color }}
      >
        {formatMoney(value, "RUB")}
      </p>
    </div>
  );
}
