import { requireUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function RentierDashboardPage() {
  await requireUser();

  return (
    <>
      <PageHeader title="Рантье" subtitle="Раздел в разработке" />
      <div className="card p-6 text-sm text-text-muted">
        Скоро здесь появятся инструменты для управления пассивным доходом.
      </div>
    </>
  );
}
