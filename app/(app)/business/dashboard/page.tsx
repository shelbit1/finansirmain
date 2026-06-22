import { Briefcase } from "lucide-react";

export const metadata = { title: "Бизнес — Финансыр" };

export default function BusinessDashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Briefcase className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold mb-1">Бизнес-режим</h1>
        <p className="text-text-muted text-sm max-w-xs">
          Этот раздел находится в разработке. Скоро здесь появятся инструменты
          для управления бизнес-финансами.
        </p>
      </div>
    </div>
  );
}
