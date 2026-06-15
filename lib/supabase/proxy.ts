import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/categories",
  "/debts",
  "/assets",
  "/settings",
  "/plans",
  "/reports",
  "/billing",
];
const PUBLIC_AUTH_PATHS = ["/login", "/register"];

/**
 * Обновляет Auth-сессию Supabase на каждом запросе и пробрасывает свежие
 * токены и в Server Components (request.cookies), и в браузер
 * (response.cookies). Дополнительно защищает приватные маршруты.
 *
 * Вызывается из корневого proxy.ts и возвращает готовый NextResponse.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims проверяет подпись JWT — безопасно доверять результату на сервере.
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPage = PUBLIC_AUTH_PATHS.includes(pathname);

  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
