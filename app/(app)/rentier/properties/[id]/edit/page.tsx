import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { serializeProperty } from "@/lib/rentier";
import { PageHeader } from "@/components/ui/PageHeader";
import { PropertyForm } from "@/components/app/rentier/PropertyForm";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireActiveSubscription();
  const { id } = await params;

  const property = await prisma.rentierProperty.findUnique({
    where: { id },
    include: { tenants: { orderBy: { createdAt: "asc" } } },
  });
  if (!property || property.userId !== userId) notFound();

  return (
    <>
      <PageHeader
        title="Редактирование объекта"
        subtitle={property.title}
      />
      <PropertyForm property={serializeProperty(property)} />
    </>
  );
}
