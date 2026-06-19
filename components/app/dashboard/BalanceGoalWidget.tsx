"use client";

import { useEffect, useRef, useState } from "react";
import { Target, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard:balance_goal";

function parseGoal(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  return isFinite(n) && n > 0 ? n : null;
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function parseInput(raw: string): number | null {
  // Принимаем числа вида "20 000 000", "20000000", "20.5", "20,5"
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isFinite(n) && n > 0 ? n : null;
}

export function BalanceGoalWidget({ balance }: { balance: number }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoal(parseGoal(localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    if (editing) {
      setInputValue(goal ? String(Math.round(goal)) : "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, goal]);

  function handleSave() {
    const parsed = parseInput(inputValue);
    if (parsed) {
      localStorage.setItem(STORAGE_KEY, String(parsed));
      setGoal(parsed);
    }
    setEditing(false);
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEY);
    setGoal(null);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  }

  // ─── Режим: цель не задана ────────────────────────────────────────────────
  if (!goal && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
      >
        <Target className="w-3.5 h-3.5" />
        Задать цель по балансу
      </button>
    );
  }

  // ─── Режим: форма ввода цели ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="20 000 000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-36 px-2 py-1 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary/40 tnum"
          />
          <span className="text-sm text-text-muted shrink-0">₽</span>
          <button
            type="button"
            onClick={handleSave}
            className="p-1 rounded-md text-income hover:bg-income/10 transition-colors"
            title="Сохранить"
          >
            <Check className="w-4 h-4" />
          </button>
          {goal && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 rounded-md text-text-muted hover:text-expense hover:bg-expense/10 transition-colors"
              title="Удалить цель"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="p-1 rounded-md text-text-muted hover:bg-bg transition-colors text-xs"
            title="Отмена"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // ─── Режим: цель задана — показываем прогресс ─────────────────────────────
  if (!goal) return null;
  const pct = Math.min((balance / goal) * 100, 100);
  const remaining = goal - balance;
  const done = balance >= goal;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              done ? "text-income" : "text-primary",
            )}
          />
          <span className="text-xs text-text-muted truncate">
            {done ? (
              "Цель достигнута! 🎉"
            ) : (
              <>
                Осталось{" "}
                <span className="font-semibold text-text tnum">
                  {formatRub(remaining)}
                </span>
                {" · "}
                <span className="font-semibold text-text tnum">
                  {pct.toFixed(1)}%
                </span>{" "}
                из{" "}
                <span className="tnum">{formatRub(goal)}</span>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1 rounded-md text-text-muted hover:text-primary hover:bg-bg transition-colors shrink-0"
          title="Изменить цель"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>

      {/* Прогресс-бар */}
      <div className="h-1.5 rounded-full bg-bg overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            done ? "bg-income" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
