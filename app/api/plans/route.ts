import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { planSchema, planTypeSchema } from "@/lib/validators";
import { createPlan } from "@/lib/planRepo";

export async function GET(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const completedParam = url.searchParams.get("completed");

  const where: Prisma.PlanWhereInput = { userId: auth.userId };
  if (type) {
    const parsed = planTypeSchema.safeParse(type);
    if (parsed.success) where.type = parsed.data;
  }
  if (completedParam === "true") where.completed = true;
  if (completedParam === "false") where.completed = false;

  const items = await prisma.plan.findMany({
    where,
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = planSchema.parse(body);
    const plan = await createPlan({
      userId: auth.userId,
      type: data.type,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      dueDate: data.dueDate ?? null,
      note: data.note,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
