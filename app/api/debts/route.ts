import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { debtDirectionSchema, debtSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const direction = url.searchParams.get("direction");
  const status = url.searchParams.get("status");

  const where: Prisma.DebtWhereInput = { userId: auth.userId };
  if (direction) {
    const parsed = debtDirectionSchema.safeParse(direction);
    if (parsed.success) where.direction = parsed.data;
  }
  if (status === "ACTIVE" || status === "PARTIALLY_PAID" || status === "CLOSED") {
    where.status = status;
  }

  const debts = await prisma.debt.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      payments: { orderBy: { date: "desc" } },
    },
  });
  return NextResponse.json({ debts });
}

export async function POST(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = debtSchema.parse(body);
    const debt = await prisma.debt.create({
      data: {
        userId: auth.userId,
        direction: data.direction,
        personName: data.personName,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate ?? null,
        description: data.description,
      },
    });
    return NextResponse.json({ debt }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
