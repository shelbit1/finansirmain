import { requireUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/components/app/settings/ProfileForm";
import { PasswordForm } from "@/components/app/settings/PasswordForm";
import { DeleteAccount } from "@/components/app/settings/DeleteAccount";

export const metadata = { title: "Настройки — Финансыр" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Настройки" subtitle="Профиль и безопасность" />

      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Профиль</h2>
          <ProfileForm defaultName={user.name ?? ""} email={user.email} />
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Смена пароля</h2>
          <PasswordForm />
        </section>

        <section className="card p-5 border-expense/40">
          <h2 className="font-display text-lg font-semibold mb-1 text-expense">Опасная зона</h2>
          <p className="text-sm text-text-muted mb-4">
            Удаление аккаунта необратимо. Все ваши финансовые данные будут потеряны.
          </p>
          <DeleteAccount />
        </section>
      </div>
    </>
  );
}
