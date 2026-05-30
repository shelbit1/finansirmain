import "server-only";

const KIE_BASE = process.env.KIE_API_BASE ?? "https://api.kie.ai";
const KIE_TOKEN = process.env.KIE_API_TOKEN;

/** Актуальная модель Claude Opus у kie.ai (см. docs.kie.ai → Market/Chat/Claude). */
export const KIE_CLAUDE_MODEL = "claude-opus-4-6";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicResp = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
};

/**
 * Запрос к kie.ai (Claude Opus 4.6). Сервер-only.
 *
 * kie.ai предоставляет Anthropic-нативный API через `/claude/v1/messages`:
 * системный промпт передаётся top-level полем `system`, ответ приходит
 * массивом `content` блоков с `type: "text"`.
 *
 * Бросает Error, если токен не настроен или API вернул не-2xx / пустой ответ.
 */
export async function askKieAI(
  messages: ChatMessage[],
  systemPrompt: string,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  if (!KIE_TOKEN) {
    throw new Error("KIE_API_TOKEN не настроен на сервере");
  }

  const response = await fetch(`${KIE_BASE}/claude/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_TOKEN}`,
    },
    body: JSON.stringify({
      model: KIE_CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      stream: false,
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`kie.ai ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as AnthropicResp;
  const text = data.content
    ?.filter((c) => c.type === "text" || typeof c.text === "string")
    .map((c) => c.text ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    if (data.error?.message) throw new Error(`kie.ai: ${data.error.message}`);
    throw new Error("kie.ai вернул пустой ответ");
  }
  return text;
}
