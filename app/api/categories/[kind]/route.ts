import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import { isCategoryKind, repoFor } from "@/lib/categoryRepo";

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!isCategoryKind(kind)) return jsonError("Неверный тип категории", 400);

  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const repo = repoFor(kind);
  const categories = await repo.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
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
    const repo = repoFor(kind);
    const category = await repo.create({ data: { ...data, userId: auth.userId } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
