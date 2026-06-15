import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Клиент Supabase для серверного кода: Server Components, Server Actions
 * и Route Handlers. Привязан к cookies текущего запроса, поэтому запросы
 * к данным выполняются от имени авторизованного пользователя (RLS).
 *
 * Создавайте новый клиент на каждый запрос — он лёгкий.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // В Server Components запись cookies запрещена — токены обновляет
          // proxy.ts. Поэтому ошибку здесь безопасно игнорировать.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // no-op
          }
        },
      },
    },
  );
}
