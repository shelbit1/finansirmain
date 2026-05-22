import "server-only";
import { prisma } from "@/lib/db";

export type CategoryKind = "income" | "expense";

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export function isCategoryKind(value: string): value is CategoryKind {
  return value === "income" || value === "expense";
}

type Repo = {
  findMany: (args: {
    where: { userId: string };
    orderBy?:
      | { createdAt: "asc" | "desc" }
      | { position: "asc" | "desc" }
      | Array<
          { position: "asc" | "desc" } | { createdAt: "asc" | "desc" }
        >;
  }) => Promise<CategoryRecord[]>;
  findUnique: (args: {
    where: { id: string };
  }) => Promise<CategoryRecord | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<CategoryRecord>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<CategoryRecord>;
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
  delete: (args: { where: { id: string } }) => Promise<CategoryRecord>;
  count: (args: { where: Record<string, unknown> }) => Promise<number>;
  aggregate: (args: {
    where: Record<string, unknown>;
    _max?: { position: true };
  }) => Promise<{ _max: { position: number | null } }>;
};

/** Стандартный порядок: ручная позиция → дата создания. */
export const CATEGORY_ORDER_BY = [
  { position: "asc" as const },
  { createdAt: "asc" as const },
];

export function repoFor(kind: CategoryKind): Repo {
  return (
    kind === "income" ? prisma.incomeCategory : prisma.expenseCategory
  ) as unknown as Repo;
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

/**
 * Проверяет, что parentId можно использовать в качестве родителя.
 * Правила:
 * - parent существует и принадлежит этому же пользователю
 * - parent — корневая (parentId == null), т.к. дерево максимум двухуровневое
 * - parent.id !== self.id (нельзя стать родителем самому себе)
 * - если self уже имеет детей — её саму нельзя сделать дочерней
 */
export async function validateParent(
  kind: CategoryKind,
  userId: string,
  parentId: string,
  selfId: string | null,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (selfId && parentId === selfId) {
    return { ok: false, error: "Категория не может быть родителем самой себя", status: 400 };
  }

  const repo = repoFor(kind);
  const parent = await repo.findUnique({ where: { id: parentId } });
  if (!parent || parent.userId !== userId) {
    return { ok: false, error: "Родительская категория не найдена", status: 404 };
  }
  if (parent.parentId) {
    return { ok: false, error: "Поддерживается не более двух уровней вложенности", status: 400 };
  }

  if (selfId) {
    const childrenCount = await repo.count({
      where: { userId, parentId: selfId },
    });
    if (childrenCount > 0) {
      return {
        ok: false,
        error: "У категории есть подкатегории — её нельзя сделать дочерней",
        status: 400,
      };
    }
  }
  return { ok: true };
}
