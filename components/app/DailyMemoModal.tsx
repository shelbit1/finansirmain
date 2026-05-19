"use client";

import { useState, useTransition } from "react";

const RULES = [
  "Золото растёт в руках тех, кто откладывает десятую часть доходов",
  "Золото работает, когда владелец продолжает заниматься доходными делами",
  "Золото не уходит от благоразумных хозяев",
  "Золото уходит, когда его вкладывают в малознакомое дело",
  "Золото уходит от тех, кто верит в удачу без усилий",
  "Не вкладываться в темки и хайп",
  "Не стоит лезть во все подряд, лучше светить, как луч, не быть лампочкой",
];

export function DailyMemoModal({ show: initialShow }: { show: boolean }) {
  const [show, setShow] = useState(initialShow);
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!show) return null;

  const onContinue = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/daily-checkin", { method: "POST" });
        if (res.ok) setShow(false);
      } catch {
        setShow(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8 animate-slide-up">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">📜</div>
          <h2 className="font-display text-2xl font-bold">Напоминание дня</h2>
          <p className="text-text-muted text-sm mt-1">
            Несколько простых правил, проверенных временем
          </p>
        </div>

        <ol className="space-y-3 mb-6">
          {RULES.map((rule, i) => (
            <li
              key={i}
              className="flex gap-3 p-3 rounded-lg bg-bg border border-border"
            >
              <span className="font-display font-semibold text-primary tabular-nums shrink-0 w-6">
                {i + 1}.
              </span>
              <span className="text-sm leading-relaxed">
                <span className="text-asset mr-1">✦</span>
                {rule}
              </span>
            </li>
          ))}
        </ol>

        <label className="flex items-start gap-3 px-3 py-3 rounded-lg bg-bg border border-border cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
          />
          <span className="text-sm">Я прочитал(а) и принимаю эти правила</span>
        </label>

        <button
          type="button"
          onClick={onContinue}
          disabled={!agreed || pending}
          className="btn btn-primary w-full"
        >
          {pending ? "Сохраняем…" : "Продолжить"}
        </button>
      </div>
    </div>
  );
}
