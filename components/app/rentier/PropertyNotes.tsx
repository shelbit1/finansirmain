"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

const NOTES_PREFIX = "__NOTES__:";

/** Кодируем массив заметок в строку для хранения в поле notes. */
export function encodeNotes(items: string[], freeText?: string): string {
  const parts: string[] = [];
  if (items.length > 0) {
    parts.push(NOTES_PREFIX + JSON.stringify(items));
  }
  if (freeText?.trim()) {
    parts.push(freeText.trim());
  }
  return parts.join("\n\n");
}

/** Парсим поле notes обратно. */
export function decodeNotes(raw: string | null): {
  items: string[];
  freeText: string;
} {
  if (!raw) return { items: [], freeText: "" };

  const notesLine = raw
    .split("\n")
    .find((l) => l.startsWith(NOTES_PREFIX));

  let items: string[] = [];
  if (notesLine) {
    try {
      const parsed = JSON.parse(notesLine.slice(NOTES_PREFIX.length));
      if (Array.isArray(parsed)) items = parsed as string[];
    } catch {
      /* ignore */
    }
  }

  const freeText = raw
    .split("\n")
    .filter((l) => !l.startsWith(NOTES_PREFIX))
    .join("\n")
    .trim();

  return { items, freeText };
}

export function PropertyNotes({
  propertyId,
  initialNotes,
}: {
  propertyId: string;
  initialNotes: string | null;
}) {
  const { items: initItems, freeText } = decodeNotes(initialNotes);
  const [items, setItems] = useState<string[]>(initItems);
  const [draft, setDraft] = useState("");
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce сохранения при изменении
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(nextItems: string[]) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startSave(async () => {
        await fetch(`/api/rentier/properties/${propertyId}/notes`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            notes: encodeNotes(nextItems, freeText) || null,
          }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    }, 400);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    const next = [...items, text];
    setItems(next);
    setDraft("");
    persist(next);
    inputRef.current?.focus();
  }

  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    persist(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 group text-sm"
            >
              <span className="shrink-0 mt-0.5 text-text-muted">•</span>
              <span className="flex-1 min-w-0 break-words">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-expense"
                aria-label="Удалить заметку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Добавить заметку и нажать ↵"
          className="input flex-1 text-sm !h-9"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="btn btn-ghost !h-9 !px-2.5 shrink-0"
          aria-label="Добавить"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-text-muted flex items-center gap-1 h-4">
        {saving && (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Сохраняю…
          </>
        )}
        {saved && !saving && (
          <>
            <Check className="w-3 h-3 text-income" />
            Сохранено
          </>
        )}
      </div>
    </div>
  );
}
