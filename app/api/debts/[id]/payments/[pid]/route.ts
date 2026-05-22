import { NextResponse } from "next/server";
import { getPaidUserIdOrForbidden, jsonError } from "@/lib/api";
import { deletePayment } from "@/lib/debtRepo";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; pid: string }> },
) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id, pid } = await ctx.params;

  try {
    const debt = await deletePayment(auth.userId, id, pid);
    return NextResponse.json({ debt });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
