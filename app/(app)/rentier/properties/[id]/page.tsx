import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/dal";
import { serializeProperty } from "@/lib/rentier";
import { PropertyDetail } from "@/components/app/rentier/PropertyDetail";
import { AIChat } from "@/components/app/rentier/AIChat";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireActiveSubscription();
  const { id } = await params;

  const property = await prisma.rentierProperty.findUnique({
    where: { id },
    include: {
      tenants: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!property || property.userId !== userId) notFound();

  const serialized = serializeProperty(property);

  return (
    <div className="space-y-6">
      <PropertyDetail property={serialized} />
      <AIChat propertyId={serialized.id} title="ИИ-анализ объекта" />
    </div>
  );
}
