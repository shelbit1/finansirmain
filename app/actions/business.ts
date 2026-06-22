"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";

export type ProjectFormState = {
  ok?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
} | null;

const projectSchema = z.object({
  name: z.string().min(1, "Введите название").max(100, "Не более 100 символов"),
  description: z.string().max(500, "Не более 500 символов").optional(),
});

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.businessProject.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });

  revalidatePath("/business/dashboard");
  return { ok: true };
}

export async function deleteProjectAction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.businessProject.delete({
    where: { id, userId: user.id },
  });
  revalidatePath("/business/dashboard");
}
