import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Регистрация — Финансыр" };

export default async function RegisterPage() {
  const session = await readSession();
  if (session?.userId) redirect("/dashboard");

  return (
    <div className="card p-7">
      <h1 className="font-display text-2xl font-semibold mb-1">Создайте аккаунт</h1>
      <p className="text-text-muted text-sm mb-6">
        Бесплатно. Никаких карт, никаких подвохов.
      </p>

      <RegisterForm />

      <p className="text-sm text-text-muted mt-6 text-center">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
