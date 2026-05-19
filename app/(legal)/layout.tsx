import Link from "next/link";
import { Footer } from "@/components/landing/Footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <header className="px-6 py-5 border-b border-border bg-surface">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Финансыр
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text hover:text-primary"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="btn btn-primary text-sm h-10 px-4 sm:px-5"
            >
              Регистрация
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}
