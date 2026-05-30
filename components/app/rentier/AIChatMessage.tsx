"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, ChevronRight, User } from "lucide-react";

export type ChatTurn = {
  id: string;
  prompt: string;
  response: string;
  createdAt: string;
};

/** Очищает markdown от служебных символов для коротких превью. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/^[*\-+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Компактная строка для списка истории ИИ-анализов.
 * При клике родитель открывает модалку с полным ответом.
 */
export function AIChatMessageItem({
  turn,
  onClick,
}: {
  turn: ChatTurn;
  onClick: () => void;
}) {
  const preview = stripMarkdown(turn.response).slice(0, 140);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-bg/40 hover:bg-bg hover:border-primary/40 transition-colors p-3 group"
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="font-medium text-sm truncate">{turn.prompt}</span>
            <span className="shrink-0 text-[11px] text-text-muted tabular-nums">
              {formatTime(turn.createdAt)}
            </span>
          </div>
          <p className="text-xs text-text-muted line-clamp-2">{preview}…</p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0 group-hover:text-primary mt-1" />
      </div>
    </button>
  );
}

/**
 * Полный ответ ИИ для отображения в модальном окне: вопрос пользователя
 * сверху, ниже — ответ с разметкой Markdown/GFM.
 */
export function AIChatMessageDetail({ turn }: { turn: ChatTurn }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-bg p-3">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1.5">
          <User className="w-3.5 h-3.5" />
          <span>Вопрос · {formatTime(turn.createdAt)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{turn.prompt}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span>Ответ ИИ</span>
        </div>
        <div className="prose prose-sm max-w-none text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
