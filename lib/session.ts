import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SessionPayload {
  userId: string;
  email?: string;
}

/**
 * Читает текущую сессию из Supabase Auth.
 *
 * Использует `getClaims()`, который проверяет подпись JWT по публичным ключам
 * проекта, поэтому результату можно доверять на сервере.
 */
export async function readSession(): Promise<SessionPayload | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) return null;
  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}

/** Завершает текущую сессию пользователя (выход). */
export async function destroySession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
