import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const getSession = cache(async () => {
  return readSession();
});

export const requireUserId = cache(async (): Promise<string> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session.userId;
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
