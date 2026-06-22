import { Briefcase } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectCard } from "@/components/app/business/ProjectCard";
import { CreateProjectButton } from "@/components/app/business/CreateProjectButton";

export const metadata = { title: "Бизнес — Финансыр" };

export default async function BusinessDashboardPage() {
  const user = await requireUser();

  const projects = await prisma.businessProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Бизнес"
        subtitle="Управляйте своими бизнес-проектами"
        action={<CreateProjectButton />}
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg mb-1">Нет проектов</p>
            <p className="text-text-muted text-sm max-w-xs">
              Создайте первый бизнес-проект, чтобы начать отслеживать его финансы.
            </p>
          </div>
          <CreateProjectButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </>
  );
}
