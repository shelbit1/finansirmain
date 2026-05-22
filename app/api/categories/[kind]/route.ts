import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import {
  CATEGORY_ORDER_BY,
  isCategoryKind,
  repoFor,
  validateParent,
} from "@/lib/categoryRepo";

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const repo = repoFor(kind);
  const categories = await repo.findMany({
    where: { userId: auth.userId },
    orderBy: CATEGORY_ORDER_BY,
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = categorySchema.parse(body);

    if (data.parentId) {
      const check = await validateParent(kind, auth.userId, data.parentId, null);
      if (!check.ok) return jsonError(check.error, check.status);
    }

    const repo = repoFor(kind);
    // Новая категория добавляется в конец своего уровня
    const max = await repo.aggregate({
      where: { userId: auth.userId, parentId: data.parentId ?? null },
      _max: { position: true },
    });
    const position = (max._max.position ?? -1) + 1;

    const category = await repo.create({
      data: { ...data, position, userId: auth.userId },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
