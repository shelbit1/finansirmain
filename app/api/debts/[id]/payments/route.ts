import { NextResponse } from "next/server";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { debtPaymentSchema } from "@/lib/validators";
import { addPayment } from "@/lib/debtRepo";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;

  try {
    const body = await readJson(req);
    const data = debtPaymentSchema.parse(body);
    const debt = await addPayment(auth.userId, id, data);
    return NextResponse.json({ debt }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
