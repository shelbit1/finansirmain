"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  AIChatMessageDetail,
  AIChatMessageItem,
  type ChatTurn,
} from "./AIChatMessage";

type AnalysisDto = {
  id: string;
  prompt: string;
  response: string;
  createdAt: string;
};

const PROPERTY_QUICK_QUESTIONS = [
  "Оцени инвестиционную привлекательность",
  "Какие риски у этого объекта?",
  "Доходность выше или ниже рынка?",
  "Что можно улучшить в экономике?",
  "Проверь арендаторов: есть ли риски?",
];

const PORTFOLIO_QUICK_QUESTIONS = [
  "Оцени диверсификацию портфеля",
  "Какой объект самый выгодный?",
  "Где наибольшие риски?",
  "Советы по развитию портфеля",
];

export function AIChat({
  propertyId,
  title,
}: {
  propertyId?: string;
  title: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [openTurn, setOpenTurn] = useState<ChatTurn | null>(null);

  const quickQuestions = propertyId
    ? PROPERTY_QUICK_QUESTIONS
    : PORTFOLIO_QUICK_QUESTIONS;

  useEffect(() => {
    const url = propertyId
      ? `/api/rentier/ai?propertyId=${propertyId}`
      : "/api/rentier/ai";
    fetch(url)
      .then((r) => r.json())
      .then((data: { analyses: AnalysisDto[] }) => {
        setTurns(
          data.analyses
            .slice()
            .reverse()
            .map((a) => ({
              id: a.id,
              prompt: a.prompt,
              response: a.response,
              createdAt: a.createdAt,
            })),
        );
      })
      .catch(() => {
        /* история не критична */
      })
      .finally(() => setLoadingHistory(false));
  }, [propertyId]);

  async function send(question: string) {
    if (!question.trim() || thinking) return;
    setError(null);

    startThinking(async () => {
      try {
        const res = await fetch("/api/rentier/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propertyId: propertyId ?? null, prompt: question }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Ошибка ИИ");
        }
        const data = (await res.json()) as { id: string; response: string };
        const newTurn: ChatTurn = {
          id: data.id,
          prompt: question,
          response: data.response,
          createdAt: new Date().toISOString(),
        };
        setTurns((prev) => [...prev, newTurn]);
        setPrompt("");
        setOpenTurn(newTurn);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(prompt);
  }

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
        <div className="font-display text-base font-semibold">{title}</div>
      </div>

      <div className="space-y-2">
        {loadingHistory ? (
          <div className="text-sm text-text-muted">Загружаю историю…</div>
        ) : turns.length === 0 ? (
          <div className="text-sm text-text-muted">
            Задай вопрос ниже — ответы появятся здесь и сохранятся в истории.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
            {turns
              .slice()
              .reverse()
              .map((t) => (
                <AIChatMessageItem
                  key={t.id}
                  turn={t}
                  onClick={() => setOpenTurn(t)}
                />
              ))}
          </div>
        )}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-text-muted pt-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            ИИ думает…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={thinking}
            onClick={() => void send(q)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-bg text-text-muted hover:text-text disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            propertyId
              ? "Спроси что-нибудь об объекте…"
              : "Спроси что-нибудь о портфеле…"
          }
          rows={2}
          disabled={thinking}
          className="input flex-1 !h-auto py-2 resize-none"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || thinking}
          className="btn btn-primary !h-11 !px-3"
          aria-label="Отправить"
        >
          {thinking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {error && <div className="text-xs text-expense">{error}</div>}

      <Modal
        open={Boolean(openTurn)}
        onClose={() => setOpenTurn(null)}
        title="ИИ-анализ"
        maxWidth="max-w-3xl"
      >
        {openTurn && <AIChatMessageDetail turn={openTurn} />}
      </Modal>
    </div>
  );
}
