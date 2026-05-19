import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Вход — Финансыр" };

export default async function LoginPage() {
  const session = await readSession();
  if (session?.userId) redirect("/dashboard");

  return (
    <div className="card p-7">
      <h1 className="font-display text-2xl font-semibold mb-1">С возвращением</h1>
      <p className="text-text-muted text-sm mb-6">Войдите в свой аккаунт «Финансыр»</p>

      <LoginForm />

      <p className="text-sm text-text-muted mt-6 text-center">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
