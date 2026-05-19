import "server-only";
import { prisma } from "@/lib/db";

export type CategoryKind = "income" | "expense";

export function isCategoryKind(value: string): value is CategoryKind {
  return value === "income" || value === "expense";
}

type Repo = {
  findMany: (args: { where: { userId: string }; orderBy: { createdAt: "asc" } }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<{ id: string; userId: string } | null>;
  create: (args: { data: unknown }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export function repoFor(kind: CategoryKind): Repo {
  return (kind === "income" ? prisma.incomeCategory : prisma.expenseCategory) as unknown as Repo;
}

export async function countTransactionsForCategory(
  kind: CategoryKind,
  userId: string,
  id: string,
): Promise<number> {
  return prisma.transaction.count({
    where:
      kind === "income"
        ? { userId, incomeCategoryId: id }
        : { userId, expenseCategoryId: id },
  });
}
