import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { BalanceDashboard } from "@/components/app/balance/BalanceDashboard";

export const metadata = { title: "Баланс — Финансыр" };

export default async function BalancePage() {
  await requireActiveSubscription();
  return (
    <>
      <PageHeader
        title="Баланс"
        subtitle="Чистый капитал: счета, активы и долги в одной точке"
      />
      <BalanceDashboard />
    </>
  );
}
