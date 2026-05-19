import { NextResponse } from "next/server";
import {
  getUserIdOrUnauthorized,
  handleZod,
  jsonError,
  readJson,
} from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import {
  countTransactionsForCategory,
  isCategoryKind,
  repoFor,
} from "@/lib/categoryRepo";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const repo = repoFor(kind);
  const existing = await repo.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return jsonError("Категория не найдена", 404);
  }

  try {
    const body = await readJson(req);
    const data = categorySchema.partial().parse(body);
    const category = await repo.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const repo = repoFor(kind);
  const existing = await repo.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return jsonError("Категория не найдена", 404);
  }

  const count = await countTransactionsForCategory(kind, auth.userId, id);
  if (count > 0) {
    return jsonError(
      `К категории привязано ${count} операций. Сначала переназначьте или удалите их.`,
      409,
    );
  }

  await repo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
