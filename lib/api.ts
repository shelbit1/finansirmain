import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  describeSubscription,
  ensureTrialSubscription,
} from "@/lib/billing";
import { getAccessTier, hasPaidAccess } from "@/lib/access";

export async function getUserIdOrUnauthorized(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await readSession();
  if (!session?.userId) {
    return {
      response: NextResponse.json({ error: "Не авторизован" }, { status: 401 }),
    };
  }
  return { userId: session.userId };
}

/**
 * Гард для API эндпоинтов платных фич (долги, активы, баланс и т. п.).
 * Возвращает userId, либо `response` 401 (не авторизован) / 402 (бесплатный тариф).
 */
export async function getPaidUserIdOrForbidden(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const auth = await getUserIdOrUnauthorized();
  if ("response" in auth) return auth;

  let sub = await prisma.subscription.findUnique({
    where: { userId: auth.userId },
  });
  if (!sub) sub = await ensureTrialSubscription(auth.userId);
  const view = describeSubscription(sub);
  if (!hasPaidAccess(getAccessTier(view))) {
    return {
      response: NextResponse.json(
        {
          error:
            "Эта функция доступна только в платной подписке. Оформите подписку, чтобы продолжить.",
        },
        { status: 402 },
      ),
    };
  }
  return { userId: auth.userId };
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleZod(error: unknown): NextResponse | null {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  return null;
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Некорректный JSON");
  }
}
