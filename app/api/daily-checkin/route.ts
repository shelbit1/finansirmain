import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized } from "@/lib/api";
import { todayString } from "@/lib/utils";

export async function POST() {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const date = todayString();
  await prisma.dailyCheckIn.upsert({
    where: { userId_date: { userId: auth.userId, date } },
    update: {},
    create: { userId: auth.userId, date },
  });

  return NextResponse.json({ ok: true, date });
}

export async function GET() {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const date = todayString();
  const existing = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId: auth.userId, date } },
  });

  return NextResponse.json({ checkedIn: Boolean(existing), date });
}
