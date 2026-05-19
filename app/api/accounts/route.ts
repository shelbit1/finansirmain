import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdOrUnauthorized, handleZod, jsonError, readJson } from "@/lib/api";
import { accountSchema } from "@/lib/validators";

export async function GET() {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  const accounts = await prisma.account.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(req);
    const data = accountSchema.parse(body);
    const account = await prisma.account.create({
      data: { ...data, userId: auth.userId },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }
}
