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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card max-w-lg w-full max-h-[95dvh] overflow-y-auto p-4 sm:p-5 animate-slide-up">
        <div className="text-center mb-3">
          <div className="text-2xl leading-none mb-1">📜</div>
          <h2 className="font-display text-lg sm:text-xl font-bold">
            Напоминание дня
          </h2>
          <p className="text-text-muted text-xs mt-0.5">
            Несколько простых правил, проверенных временем
          </p>
        </div>

        <ol className="space-y-1.5 mb-3">
          {RULES.map((rule, i) => (
            <li
              key={i}
              className="flex gap-2 px-2.5 py-1.5 rounded-lg bg-bg border border-border"
            >
              <span className="font-display font-semibold text-primary tabular-nums shrink-0 w-5 text-sm">
                {i + 1}.
              </span>
              <span className="text-[13px] leading-snug">
                <span className="text-asset mr-1">✦</span>
                {rule}
              </span>
            </li>
          ))}
        </ol>

        <label className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-bg border border-border cursor-pointer mb-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer shrink-0"
          />
          <span className="text-[13px] leading-tight">
            Я прочитал(а) и принимаю эти правила
          </span>
        </label>

        <button
          type="button"
          onClick={onContinue}
          disabled={!agreed || pending}
          className="btn btn-primary w-full h-10"
        >
          {pending ? "Сохраняем…" : "Продолжить"}
        </button>
      </div>
    </div>
  );
}
