import { requireActiveSubscription } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PropertyForm } from "@/components/app/rentier/PropertyForm";

export default async function NewPropertyPage() {
  await requireActiveSubscription();

  return (
    <>
      <PageHeader
        title="Новый объект"
        subtitle="Заполни основное и экономику — доходность пересчитается автоматически"
      />
      <PropertyForm />
    </>
  );
}
