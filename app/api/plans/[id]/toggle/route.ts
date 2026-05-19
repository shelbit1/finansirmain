import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, jsonError } from "@/lib/api";
import { togglePlan } from "@/lib/planRepo";

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const plan = await togglePlan(auth.userId, id);
    return NextResponse.json({ plan });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
