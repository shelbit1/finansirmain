import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Админский Supabase-клиент с секретным ключом (service role).
 * Используется ТОЛЬКО на сервере для привилегированных операций
 * (например, удаление пользователя из `auth.users`).
 *
 * ВАЖНО: секретный ключ никогда не должен попадать в браузер.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY is not set in environment");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
