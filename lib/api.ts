import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readSession } from "@/lib/session";

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
