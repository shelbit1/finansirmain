"use client";

import { cn } from "@/lib/utils";

const COLORS = [
  "#3D7EFF", "#22C55E", "#EF4444", "#8B5CF6", "#F97316",
  "#06B6D4", "#EAB308", "#EC4899", "#10B981", "#6366F1",
];

const EMOJIS = ["💰", "💵", "💳", "🏦", "🪙", "📈", "🏠", "🚗", "🛒", "🍽️", "🎬", "💼", "🎁", "💊", "📱", "👕", "✈️", "🎓", "⚡", "🔥"];

export function ColorPicker({
  name,
  value,
  defaultValue = "#3D7EFF",
}: {
  name: string;
  value?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {COLORS.map((c) => (
        <label
          key={c}
          className="cursor-pointer"
          title={c}
        >
          <input
            type="radio"
            name={name}
            value={c}
            defaultChecked={value ? value === c : c === defaultValue}
            className="peer sr-only"
          />
          <span
            className={cn(
              "block w-8 h-8 rounded-full border-2 transition-transform peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-offset-2 ring-text",
            )}
            style={{ background: c, borderColor: c }}
          />
        </label>
      ))}
    </div>
  );
}

export function EmojiPicker({
  name,
  value,
  defaultValue = "💰",
}: {
  name: string;
  value?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {EMOJIS.map((e) => (
        <label key={e} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={e}
            defaultChecked={value ? value === e : e === defaultValue}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-bg text-lg",
              "peer-checked:border-primary peer-checked:bg-primary/10",
            )}
          >
            {e}
          </span>
        </label>
      ))}
    </div>
  );
}
