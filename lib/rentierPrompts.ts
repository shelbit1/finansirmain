import "server-only";
import type { RentierProperty, RentierTenant } from "@prisma/client";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  CONDITION_LABELS,
  dec,
} from "@/lib/rentier";
import { isPlaceholderDate } from "@/lib/utils";

type PropertyWithTenants = RentierProperty & { tenants: RentierTenant[] };

function fmtRub(value: number | null): string {
  return value === null ? "не указана" : `${value.toLocaleString("ru-RU")} ₽`;
}

export function buildPropertySystemPrompt(): string {
  return `Ты — эксперт по коммерческой недвижимости в России.
Анализируй объекты недвижимости с точки зрения инвестиционной привлекательности.
Давай конкретные, практичные советы на русском языке.
Используй реальные рыночные ориентиры: нормальная доходность коммерческой недвижимости в РФ — 8–12% годовых.
Будь честен: если объект невыгоден — скажи прямо.
Формат ответа: Markdown. Используй заголовки, списки, выделение ключевых цифр.`;
}

export function buildPortfolioSystemPrompt(): string {
  return `Ты — эксперт по инвестиционному портфелю коммерческой недвижимости в России.
Анализируй портфель объектов: диверсификацию, доходность, риски, рекомендации по оптимизации.
Ориентиры рынка РФ: доходность 8–12%, нормальный срок окупаемости 8–12 лет.
Отвечай на русском языке в формате Markdown.`;
}

export function buildPropertyUserMessage(
  property: PropertyWithTenants,
  userQuestion: string,
): string {
  const p = property;
  const yieldsLine = [
    dec(p.grossYield) !== null ? `Валовая доходность: ${dec(p.grossYield)}%` : null,
    dec(p.netYield) !== null ? `Чистая доходность: ${dec(p.netYield)}%` : null,
    dec(p.paybackYears) !== null ? `Окупаемость: ${dec(p.paybackYears)} лет` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const tenantInfo =
    p.hasTenants && p.tenants.length > 0
      ? p.tenants
          .map((t) => {
            const parts = [`  - ${t.name}`];
            if (t.category) parts.push(`(${t.category})`);
            const area = dec(t.area);
            if (area !== null) parts.push(`${area} кв.м`);
            const rent = dec(t.rentMonth);
            if (rent !== null)
              parts.push(`${rent.toLocaleString("ru-RU")} ₽/мес`);
            if (t.leaseEnd && !isPlaceholderDate(t.leaseEnd))
              parts.push(`договор до ${t.leaseEnd.toLocaleDateString("ru-RU")}`);
            return parts.join(", ");
          })
          .join("\n")
      : p.tenantPlan
        ? `Арендаторов нет. Планы: ${p.tenantPlan}`
        : "Арендаторов нет. Планы не указаны.";

  const location =
    [p.city, p.district, p.address].filter(Boolean).join(", ") || "не указан";
  const metroStr = p.metro
    ? `${p.metro}${p.metroWalk ? `, ${p.metroWalk} мин. пешком` : ""}`
    : "не указано";
  const area = dec(p.area);
  const floorStr = p.floor
    ? `${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ""}`
    : "не указан";

  const rentMonth = dec(p.rentMonth);
  const rentPerSqm = dec(p.rentPerSqm);
  const rentIndexPct = dec(p.rentIndexPct);
  const communal = dec(p.communal);
  const tax = dec(p.tax);
  const management = dec(p.management);

  return `## Объект: ${p.title}

**Тип**: ${PROPERTY_TYPE_LABELS[p.type].label}
**Статус**: ${PROPERTY_STATUS_LABELS[p.status].label}
**Адрес**: ${location}
**Метро**: ${metroStr}
**Площадь**: ${area !== null ? `${area} кв.м` : "не указана"}
**Этаж**: ${floorStr}
**Год постройки**: ${p.yearBuilt ?? "не указан"}
**Состояние**: ${p.condition ? CONDITION_LABELS[p.condition] : "не указано"}

### Экономика
**Цена продавца**: ${fmtRub(dec(p.askPrice))}
**Своя оценка**: ${fmtRub(dec(p.ownPrice))}
**Цена за кв.м**: ${fmtRub(dec(p.pricePerSqm))}
**Аренда**: ${rentMonth !== null ? `${rentMonth.toLocaleString("ru-RU")} ₽/мес` : "не указана"}
**Аренда за кв.м**: ${rentPerSqm !== null ? `${rentPerSqm.toLocaleString("ru-RU")} ₽/кв.м` : "не указана"}
**Индексация**: ${rentIndexPct !== null ? `${rentIndexPct}% в год` : "не указана"}
**Коммуналка**: ${communal !== null ? `${communal.toLocaleString("ru-RU")} ₽/мес` : "не указана"}
**Кто платит КУ**: ${p.communalPaidBy ?? "не указано"}
**Налог**: ${tax !== null ? `${tax.toLocaleString("ru-RU")} ₽/год` : "не указан"}
**Управление**: ${management !== null ? `${management.toLocaleString("ru-RU")} ₽/мес` : "не указано"}
**Расчётные показатели**: ${yieldsLine || "недостаточно данных"}

### Арендаторы
${tenantInfo}

### Заметки
${p.notes || "нет"}

---

**Вопрос пользователя**: ${userQuestion}`;
}

export function buildPortfolioUserMessage(
  properties: PropertyWithTenants[],
  userQuestion: string,
): string {
  const summary = properties
    .map((p) => {
      const area = dec(p.area);
      const ownPrice = dec(p.ownPrice);
      const netYield = dec(p.netYield);
      const meta: string[] = [];
      if (area !== null) meta.push(`${area} кв.м`);
      if (ownPrice !== null) meta.push(`${ownPrice.toLocaleString("ru-RU")} ₽`);
      if (netYield !== null) meta.push(`доходность ${netYield}%`);
      meta.push(`арендаторов: ${p.tenants.length}`);
      return `- **${p.title}** (${PROPERTY_TYPE_LABELS[p.type].label}, ${PROPERTY_STATUS_LABELS[p.status].label}) — ${meta.join(", ")}`;
    })
    .join("\n");

  return `## Портфель недвижимости (${properties.length} объектов)

${summary}

**Вопрос**: ${userQuestion}`;
}
