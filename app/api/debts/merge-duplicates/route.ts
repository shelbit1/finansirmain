import { NextResponse } from "next/server";
import { getPaidUserIdOrForbidden, jsonError } from "@/lib/api";
import { mergeDebtDuplicates } from "@/lib/debtRepo";

export async function POST() {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  try {
    const result = await mergeDebtDuplicates(auth.userId);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError((e as Error).message);
  }
}
