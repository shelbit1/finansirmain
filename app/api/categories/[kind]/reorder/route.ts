import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { isCategoryKind, repoFor } from "@/lib/categoryRepo";

const schema = z.object({
  parentId: z.string().trim().min(1).nullable().optional().transform((v) => v || null),
  ids: z.array(z.string().min(1)).min(1),
});

export async function PUT(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const { parentId, ids } = schema.parse(body);

    const repo = repoFor(kind);
    const existing = await repo.findMany({
      where: { userId: auth.userId },
    });
    const lookup = new Map(existing.map((c) => [c.id, c]));
    for (const id of ids) {
      const c = lookup.get(id);
      if (!c) return jsonError("Часть категорий не найдена", 404);
      if ((c.parentId ?? null) !== (parentId ?? null)) {
        return jsonError("Перетаскивание между уровнями запрещено", 400);
      }
    }

    const ops = ids.map((id, idx) =>
      repo.update({ where: { id }, data: { position: idx } }),
    ) as unknown as Prisma.PrismaPromise<unknown>[];
    await prisma.$transaction(ops);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
