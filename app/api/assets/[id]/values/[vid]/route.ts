import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, jsonError } from "@/lib/api";
import { deleteAssetValue } from "@/lib/assetRepo";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; vid: string }> },
) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;
  const { id, vid } = await ctx.params;

  try {
    await deleteAssetValue(auth.userId, id, vid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
