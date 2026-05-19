import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AccountsManager,
  AddAccountButton,
} from "@/components/app/accounts/AccountsManager";
import { decimalToNumber } from "@/lib/utils";

export const metadata = { title: "Счета — Финансыр" };

export default async function AccountsPage() {
  const userId = await requireUserId();
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const dto = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    icon: a.icon,
    color: a.color,
    balance: decimalToNumber(a.balance),
  }));

  return (
    <>
      <PageHeader
        title="Счета"
        subtitle="Карты, наличные, вклады — баланс пересчитывается автоматически"
        action={<AddAccountButton />}
      />
      <AccountsManager accounts={dto} />
    </>
  );
}
