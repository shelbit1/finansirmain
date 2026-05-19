import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/consent", label: "Согласие на обработку ПД" },
  { href: "/cookies", label: "Политика Cookie" },
  { href: "/terms", label: "Условия использования" },
  { href: "/refund", label: "Политика возвратов" },
  { href: "/security", label: "Политика безопасности" },
  { href: "/delivery", label: "Доступ к сервису" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div>
            <Link
              href="/"
              className="font-display text-lg font-semibold tracking-tight"
            >
              Финансыр
            </Link>
            <p className="text-sm text-text-muted mt-2 max-w-xs">
              Личный учёт финансов: счета, операции, долги, активы.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold mb-3">Сервис</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  href="/#pricing"
                  className="text-text-muted hover:text-primary"
                >
                  Тарифы
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-text-muted hover:text-primary"
                >
                  Войти
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-text-muted hover:text-primary"
                >
                  Регистрация
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold mb-3">
              Документы
            </h3>
            <ul className="space-y-1.5 text-sm">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-text-muted hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold mb-3">Контакты</h3>
            <ul className="space-y-1.5 text-sm text-text-muted">
              <li>
                <a
                  href="mailto:e.nabiev1997@yandex.com"
                  className="hover:text-primary"
                >
                  e.nabiev1997@yandex.com
                </a>
              </li>
              <li>
                <a href="tel:+79152153048" className="hover:text-primary">
                  +7 (915) 215-30-48
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border text-xs text-text-muted leading-relaxed space-y-1">
          <p>
            © {year} Финансыр. ИП Набиев Эльвин Шахлар Оглы, ИНН 531502263400,
            ОГРНИП 322530000018689.
          </p>
          <p>Сервис не является банком или финансовым советником.</p>
        </div>
      </div>
    </footer>
  );
}
