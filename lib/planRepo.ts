import "server-only";
import type { PlanType } from "@prisma/client";
import { prisma } from "@/lib/db";

type UpsertInput = {
  userId: string;
  type: PlanType;
  title: string;
  amount: number;
  currency: string;
  dueDate?: Date | null;
  note?: string;
};

export async function createPlan(input: UpsertInput) {
  return prisma.plan.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.dueDate ?? null,
      note: input.note,
    },
  });
}

export async function updatePlan(userId: string, id: string, input: UpsertInput) {
  const existing = await prisma.plan.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new Error("План не найден");

  return prisma.plan.update({
    where: { id },
    data: {
      type: input.type,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.dueDate ?? null,
      note: input.note,
    },
  });
}

export async function togglePlan(userId: string, id: string) {
  const existing = await prisma.plan.findFirst({
    where: { id, userId },
    select: { id: true, completed: true },
  });
  if (!existing) throw new Error("План не найден");

  return prisma.plan.update({
    where: { id },
    data: {
      completed: !existing.completed,
      completedAt: !existing.completed ? new Date() : null,
    },
  });
}

export async function deletePlan(userId: string, id: string) {
  const existing = await prisma.plan.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new Error("План не найден");
  await prisma.plan.delete({ where: { id } });
  return { ok: true };
}
