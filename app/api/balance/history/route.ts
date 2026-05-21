import "server-only";
import { NextResponse } from "next/server";
import { getUserIdOrUnauthorized, jsonError } from "@/lib/api";
import { computeBalanceHistory } from "@/lib/balanceHistory";
import type { Granularity } from "@/lib/balanceHistoryTypes";

export const dynamic = "force-dynamic";

function parseGranularity(v: string | null): Granularity {
  return v === "day" || v === "week" || v === "month" ? v : "month";
}

export async function GET(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const granularity = parseGranularity(url.searchParams.get("granularity"));

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const from = fromParam ? new Date(fromParam + "T00:00:00") : defaultFrom;
  const to = toParam ? new Date(toParam + "T23:59:59") : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return jsonError("Некорректный период", 400);
  }

  const data = await computeBalanceHistory(auth.userId, from, to, granularity);
  return NextResponse.json(data);
}
