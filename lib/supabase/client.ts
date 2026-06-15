import { createBrowserClient } from "@supabase/ssr";

/**
 * Клиент Supabase для Client Components (выполняется в браузере).
 * `createBrowserClient` использует singleton — повторные вызовы возвращают
 * один и тот же экземпляр.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
