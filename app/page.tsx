import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet,
  ArrowRightLeft,
  LineChart,
  Coins,
  HandCoins,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Check,
} from "lucide-react";
import { readSession } from "@/lib/session";
import { Footer } from "@/components/landing/Footer";
import {
  PLAN_PERIOD_MONTHS,
  PLAN_PRICE_RUB,
  TRIAL_DAYS,
} from "@/lib/billing";
import { formatMoney } from "@/lib/utils";

export default async function LandingPage() {
  const session = await readSession();
  if (session?.userId) redirect("/dashboard");

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <header className="px-6 py-5">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Финансыр
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#pricing"
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-text hover:text-primary"
            >
              Цены
            </Link>
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
              Попробовать бесплатно
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Hero />
        <Features />
        <Pricing />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="px-6 pt-10 sm:pt-20 pb-14">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Личные финансы под контролем
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Все ваши деньги — в одном месте
        </h1>
        <p className="text-text-muted text-lg sm:text-xl mt-5 max-w-2xl mx-auto">
          Счета, операции, долги и активы — ведите учёт спокойно и красиво. Без рекламы,
          без подключения банков, без подвохов.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="btn btn-primary px-6">
            Начать бесплатно
          </Link>
          <Link href="/login" className="btn btn-ghost px-6">
            У меня уже есть аккаунт
          </Link>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Wallet,
    title: "Счета и кошельки",
    desc: "Карты, наличные, депозиты — все балансы рассчитываются автоматически.",
    color: "var(--color-primary)",
  },
  {
    icon: ArrowRightLeft,
    title: "Операции трёх типов",
    desc: "Доход, расход, перемещение между счетами — с быстрым добавлением.",
    color: "var(--color-transfer)",
  },
  {
    icon: HandCoins,
    title: "Долги и займы",
    desc: "Учёт «я должен» и «должны мне» с частичными платежами и прогрессом.",
    color: "var(--color-debt-owe)",
  },
  {
    icon: Coins,
    title: "Личные активы",
    desc: "Квартира, авто, акции, крипта — портфель с динамикой стоимости.",
    color: "var(--color-asset)",
  },
  {
    icon: LineChart,
    title: "Понятная аналитика",
    desc: "Дашборд с графиками доходов, расходов и сводкой по портфелю.",
    color: "var(--color-income)",
  },
  {
    icon: ShieldCheck,
    title: "Безопасно",
    desc: "Пароль хэшируется, сессии в HTTP-only cookie, ваши данные — только ваши.",
    color: "var(--color-debt-get)",
  },
];

function Features() {
  return (
    <section className="px-6 py-14 bg-surface border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Возможности</h2>
          <p className="text-text-muted mt-2">Всё, что нужно для личного учёта — и ничего лишнего</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `color-mix(in srgb, ${f.color} 14%, transparent)` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FREE_INCLUDES = [
  "Операции: доходы, расходы, перемещения",
  "Отчёт «Доходы − Расходы»",
  "Счета и категории",
];

const FREE_EXCLUDES = [
  "Долги — «я должен» и «должны мне»",
  "Активы и портфель",
  "Отчёт «Баланс»",
  "Планы",
];

const PRO_INCLUDES = [
  "Всё, что в бесплатном",
  "Долги: «я должен» и «должны мне»",
  "Активы и портфель",
  "Отчёт «Баланс»",
  "Планы, ежедневная памятка",
  "Приоритетная поддержка",
];

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Тарифы
          </h2>
          <p className="text-text-muted mt-2">
            Начните бесплатно — без карты. Подключайте платный тариф, когда нужны
            долги, активы и отчёт «Баланс».
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-8 sm:p-10 flex flex-col">
            <div className="mb-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-text-muted/10 text-text-muted text-xs font-medium">
                Бесплатно
              </span>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
                  0&nbsp;₽
                </span>
                <span className="text-text-muted mb-2">/ навсегда</span>
              </div>
              <p className="text-sm text-text-muted mt-2">
                Доступно сразу после регистрации и после {TRIAL_DAYS}-дневного
                пробного периода
              </p>
            </div>

            <ul className="space-y-2 mb-4">
              {FREE_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-income shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Недоступно
            </p>
            <ul className="space-y-2 mb-6">
              {FREE_EXCLUDES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-text-muted"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="btn btn-ghost mt-auto">
              Начать бесплатно
            </Link>
          </div>

          <div className="card p-8 sm:p-10 border-primary/40 ring-1 ring-primary/20 flex flex-col">
            <div className="mb-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Платный — {TRIAL_DAYS} дней бесплатно
              </span>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
                  {formatMoney(PLAN_PRICE_RUB).replace(",00", "")}
                </span>
                <span className="text-text-muted mb-2">
                  / {PLAN_PERIOD_MONTHS} мес.
                </span>
              </div>
              <p className="text-sm text-text-muted mt-2">
                Ежемесячная подписка, отмена в любой момент
              </p>
            </div>

            <ul className="space-y-2 mb-6">
              {PRO_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-income shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <Link href="/register" className="btn btn-primary flex-1">
                Попробовать {TRIAL_DAYS} дней
              </Link>
              <Link href="/refund" className="btn btn-ghost flex-1">
                Условия возврата
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted text-center mt-6 leading-relaxed">
          Оплата через АО «Т-Банк». Реквизиты карты не попадают на наши
          серверы. Возврат — в течение 14 дней по{" "}
          <Link href="/refund" className="text-primary hover:underline">
            политике возвратов
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 py-16">
      <div className="max-w-3xl mx-auto card p-8 sm:p-12 text-center">
        <Smartphone className="w-10 h-10 mx-auto text-primary mb-3" />
        <h2 className="font-display text-2xl sm:text-3xl font-bold">
          Возьмите финансы под контроль за 2 минуты
        </h2>
        <p className="text-text-muted mt-3 max-w-xl mx-auto">
          Бесплатная регистрация, готовые категории и счёт «Наличные» уже на старте.
        </p>
        <Link href="/register" className="btn btn-primary px-6 mt-6 inline-flex">
          Создать аккаунт
        </Link>
      </div>
    </section>
  );
}
