import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { planSchema } from "@/lib/validators";
import { deletePlan, updatePlan } from "@/lib/planRepo";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = await readJson(req);
    const data = planSchema.parse(body);
    const plan = await updatePlan(auth.userId, id, {
      userId: auth.userId,
      type: data.type,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      dueDate: data.dueDate ?? null,
      note: data.note,
    });
    return NextResponse.json({ plan });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    await deletePlan(auth.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
