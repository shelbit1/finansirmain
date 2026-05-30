# context7.md — ТЗ: Режим «Рантье» в Финансыре

## Контекст проекта

Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma + Yandex PostgreSQL.
Репозиторий: finansir. Стек, структура, компоненты и утилиты — использовать как есть.
Существующий код дашборда, боковое меню, BottomBar, PageHeader, карточки UI — переиспользовать.

---

## Цель

Реализовать режим **«Рантье»** — инструмент для анализа и учёта коммерческой недвижимости.

Пользователь заносит объекты недвижимости, которые он рассматривает для инвестиций или уже купил.
По каждому объекту хранятся: тип, экономика, география, арендаторы, фото, заметки.
Встроенный ИИ (Claude Opus 4.8 через kie.ai) даёт советы по объекту или по всему портфелю.

Режим уже есть в UI как вкладка «Рантье» на дашборде. Нужно наполнить его содержимым.

---

## Типы объектов

```typescript
type PropertyType =
  | "FREE_PURPOSE"      // Помещение свободного назначения (ПСН)
  | "STREET_RETAIL"     // Стрит-ритейл
  | "SHOPPING_CENTER"   // Торговый центр (помещение в ТЦ)
  | "LAND"              // Земельный участок
  | "PARKING"           // Машиноместо / парковка
  | "WAREHOUSE"         // Склад
  | "STORAGE"           // Кладовка / кладовое помещение
```

Лейблы для UI:
```typescript
const PROPERTY_TYPE_LABELS: Record<PropertyType, { label: string; emoji: string }> = {
  FREE_PURPOSE:    { label: "Своб. назначения (ПСН)", emoji: "🏢" },
  STREET_RETAIL:   { label: "Стрит-ритейл",           emoji: "🏪" },
  SHOPPING_CENTER: { label: "Помещение в ТЦ",          emoji: "🛍️" },
  LAND:            { label: "Земля",                   emoji: "🌍" },
  PARKING:         { label: "Машиноместо",             emoji: "🚗" },
  WAREHOUSE:       { label: "Склад",                   emoji: "📦" },
  STORAGE:         { label: "Кладовка",                emoji: "🗄️" },
};
```

---

## Статусы объекта

```typescript
type PropertyStatus =
  | "WATCHING"    // Слежу / рассматриваю
  | "NEGOTIATING" // В переговорах
  | "OWNED"       // Куплен / в собственности
  | "REJECTED"    // Отклонён / не интересен
```

---

## Prisma Schema

Добавить в `prisma/schema.prisma`:

```prisma
model RentierProperty {
  id          String         @id @default(cuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  // ── Основное ──────────────────────────────────────────
  type        String         // PropertyType enum
  status      String         @default("WATCHING") // PropertyStatus enum
  title       String         // Название / адрес объекта (короткое)
  notes       String?        // Свободные заметки

  // ── География ─────────────────────────────────────────
  address     String?        // Полный адрес
  city        String?        // Город
  district    String?        // Район / округ
  metro       String?        // Ближайшее метро
  metroWalk   Int?           // Минут пешком до метро
  floor       Int?           // Этаж (null для земли)
  totalFloors Int?           // Всего этажей в здании
  yearBuilt   Int?           // Год постройки

  // ── Параметры объекта ─────────────────────────────────
  area        Decimal?       // Площадь, кв.м
  ceilingH    Decimal?       // Высота потолков, м
  entrance    String?        // Вход: STREET | YARD | SHARED
  condition   String?        // Состояние: SHELL | COSMETIC | GOOD | EXCELLENT

  // ── Экономика ─────────────────────────────────────────
  askPrice    Decimal?       // Цена продавца, ₽
  ownPrice    Decimal?       // Своя оценка / цена покупки, ₽
  pricePerSqm Decimal?       // Цена за кв.м (вычисляется или вводится вручную)

  // Аренда
  rentMonth   Decimal?       // Текущая/планируемая аренда в месяц, ₽
  rentPerSqm  Decimal?       // Аренда за кв.м в месяц, ₽
  rentIndexPct Decimal?      // Индексация аренды, % в год

  // Расходы
  communal    Decimal?       // Коммуналка в месяц, ₽
  tax         Decimal?       // Налог на имущество в год, ₽
  management  Decimal?       // УК / управление в месяц, ₽
  otherCosts  Decimal?       // Прочие расходы в месяц, ₽

  // Расчётные показатели (хранить для истории, пересчитывать при изменении)
  grossYield  Decimal?       // Валовая доходность, % годовых
  netYield    Decimal?       // Чистая доходность, % годовых
  paybackYears Decimal?      // Срок окупаемости, лет

  // ── Арендаторы ────────────────────────────────────────
  hasTenants     Boolean     @default(false)
  tenants        RentierTenant[]

  // ── Планы (если арендаторов нет) ──────────────────────
  tenantPlan  String?        // Свободный текст: кто планируется, когда
  vacancyMonths Int?         // Сколько месяцев пустует

  // ── Ссылки и фото ──────────────────────────────────────
  sourceUrl   String?        // Ссылка на объявление (ЦИАН, Авито и т.д.)
  images      RentierImage[]

  // ── AI ─────────────────────────────────────────────────
  aiAnalyses  RentierAIAnalysis[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([userId])
  @@index([userId, status])
}

model RentierTenant {
  id           String          @id @default(cuid())
  property     RentierProperty @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  propertyId   String

  name         String          // Название арендатора / бренд
  category     String?         // Категория: еда, медицина, банк, etc.
  area         Decimal?        // Занимаемая площадь, кв.м
  rentMonth    Decimal?        // Платит аренды в месяц, ₽
  leaseStart   DateTime?       // Начало договора
  leaseEnd     DateTime?       // Конец договора
  deposit      Decimal?        // Депозит, ₽
  notes        String?

  createdAt    DateTime        @default(now())

  @@index([propertyId])
}

model RentierImage {
  id           String          @id @default(cuid())
  property     RentierProperty @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  propertyId   String
  url          String          // URL изображения
  caption      String?
  order        Int             @default(0)
  createdAt    DateTime        @default(now())
}

model RentierAIAnalysis {
  id           String          @id @default(cuid())
  property     RentierProperty? @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  propertyId   String?         // null = анализ всего портфеля
  userId       String
  prompt       String          // Что спросил пользователь
  response     String          @db.Text // Ответ ИИ (Markdown)
  model        String          @default("claude-opus-4-8")
  createdAt    DateTime        @default(now())

  @@index([userId])
  @@index([propertyId])
}
```

---

## Вычисляемые показатели

При сохранении объекта автоматически пересчитывать:

```typescript
function calcYields(data: {
  askPrice?: number;
  ownPrice?: number;
  rentMonth?: number;
  communal?: number;
  tax?: number;
  management?: number;
  otherCosts?: number;
  area?: number;
}): { grossYield: number | null; netYield: number | null; paybackYears: number | null; pricePerSqm: number | null } {
  const price = data.ownPrice ?? data.askPrice;
  if (!price || !data.rentMonth) return { grossYield: null, netYield: null, paybackYears: null, pricePerSqm: null };

  const rentYear = data.rentMonth * 12;
  const costsYear = ((data.communal ?? 0) + (data.management ?? 0) + (data.otherCosts ?? 0)) * 12
                   + (data.tax ?? 0);

  const grossYield = (rentYear / price) * 100;
  const netYield = ((rentYear - costsYear) / price) * 100;
  const paybackYears = netYield > 0 ? 100 / netYield : null;
  const pricePerSqm = data.area ? price / data.area : null;

  return {
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    paybackYears: paybackYears ? Math.round(paybackYears * 10) / 10 : null,
    pricePerSqm: pricePerSqm ? Math.round(pricePerSqm) : null,
  };
}
```

---

## API Routes

### `GET /api/rentier/properties`
Список всех объектов пользователя. Query params: `status`, `type`.

### `POST /api/rentier/properties`
Создать объект. Тело: поля `RentierProperty` без id/userId/createdAt.
После создания — пересчитать `grossYield`, `netYield`, `paybackYears`.

### `GET /api/rentier/properties/[id]`
Один объект со всеми арендаторами, фото, последними AI-анализами (limit 5).

### `PATCH /api/rentier/properties/[id]`
Обновить объект. Пересчитать yields при изменении экономики.

### `DELETE /api/rentier/properties/[id]`
Удалить объект (cascade: арендаторы, фото, AI-анализы).

### `POST /api/rentier/properties/[id]/tenants`
Добавить арендатора. Обновить `hasTenants = true`.

### `PATCH /api/rentier/properties/[id]/tenants/[tenantId]`
### `DELETE /api/rentier/properties/[id]/tenants/[tenantId]`
При удалении последнего арендатора — `hasTenants = false`.

### `POST /api/rentier/ai`
Запрос к ИИ. Тело: `{ propertyId?: string; prompt: string }`.
- Если `propertyId` указан → анализ конкретного объекта
- Если не указан → анализ всего портфеля
Сохранить в `RentierAIAnalysis`. Вернуть `{ response: string; id: string }`.

### `GET /api/rentier/ai`
История AI-анализов. Query: `propertyId` (optional).

### `GET /api/rentier/portfolio`
Агрегат по всему портфелю:
```typescript
{
  totalProperties: number;
  byStatus: Record<PropertyStatus, number>;
  byType: Record<PropertyType, number>;
  totalInvested: number;       // сумма ownPrice по всем купленным
  totalRentMonth: number;      // сумма rentMonth по OWNED объектам
  avgGrossYield: number;       // среднее по портфелю
  avgNetYield: number;
  tenantsCount: number;        // всего арендаторов
}
```

---

## AI Интеграция (kie.ai → Claude Opus 4.8)

### Переменная окружения

```env
KIE_API_TOKEN=ваш_токен_из_kie_ai   # НИКОГДА не коммитить в репозиторий
KIE_API_BASE=https://api.kie.ai
```

### Клиент kie.ai

```typescript
// lib/kieai.ts
const KIE_BASE = process.env.KIE_API_BASE ?? "https://api.kie.ai";
const KIE_TOKEN = process.env.KIE_API_TOKEN!;

export async function askKieAI(messages: { role: "user" | "assistant"; content: string }[], systemPrompt: string): Promise<string> {
  const response = await fetch(`${KIE_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KIE_TOKEN}`,
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",         // модель согласно docs.kie.ai/market/claude/claude-opus-4-8
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`kie.ai error ${response.status}: ${err}`);
  }

  const data = await response.json();
  // Ответ в формате OpenAI-совместимого API
  return data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? "";
}
```

> Если kie.ai возвращает Anthropic-нативный формат (content array) — адаптировать парсинг.
> Проверить реальный ответ при первом запросе и при необходимости скорректировать.

### Системный промпт для анализа объекта

```typescript
function buildPropertySystemPrompt(property: RentierProperty & { tenants: RentierTenant[] }): string {
  return `Ты — эксперт по коммерческой недвижимости в России. 
Анализируй объекты недвижимости с точки зрения инвестиционной привлекательности.
Давай конкретные, практичные советы на русском языке.
Используй реальные рыночные ориентиры: нормальная доходность коммерческой недвижимости в РФ — 8–12% годовых.
Будь честен: если объект невыгоден — скажи прямо.
Формат ответа: Markdown. Используй заголовки, списки, выделение ключевых цифр.`;
}

function buildPropertyUserMessage(
  property: RentierProperty & { tenants: RentierTenant[] },
  userQuestion: string
): string {
  const p = property;
  const yields = [
    p.grossYield ? `Валовая доходность: ${p.grossYield}%` : null,
    p.netYield   ? `Чистая доходность: ${p.netYield}%`   : null,
    p.paybackYears ? `Окупаемость: ${p.paybackYears} лет` : null,
  ].filter(Boolean).join(", ");

  const tenantInfo = p.hasTenants && p.tenants.length > 0
    ? p.tenants.map(t =>
        `  - ${t.name}${t.category ? ` (${t.category})` : ""}` +
        `${t.area ? `, ${t.area} кв.м` : ""}` +
        `${t.rentMonth ? `, ${Number(t.rentMonth).toLocaleString("ru-RU")} ₽/мес` : ""}` +
        `${t.leaseEnd ? `, договор до ${t.leaseEnd.toLocaleDateString("ru-RU")}` : ""}`
      ).join("\n")
    : p.tenantPlan
      ? `Арендаторов нет. Планы: ${p.tenantPlan}`
      : "Арендаторов нет. Планы не указаны.";

  return `## Объект: ${p.title}

**Тип**: ${p.type}
**Статус**: ${p.status}
**Адрес**: ${[p.city, p.district, p.address].filter(Boolean).join(", ") || "не указан"}
**Метро**: ${p.metro ? `${p.metro}${p.metroWalk ? `, ${p.metroWalk} мин. пешком` : ""}` : "не указано"}
**Площадь**: ${p.area ? `${p.area} кв.м` : "не указана"}
**Этаж**: ${p.floor ? `${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ""}` : "не указан"}
**Год постройки**: ${p.yearBuilt ?? "не указан"}
**Состояние**: ${p.condition ?? "не указано"}

### Экономика
**Цена продавца**: ${p.askPrice ? Number(p.askPrice).toLocaleString("ru-RU") + " ₽" : "не указана"}
**Своя оценка**: ${p.ownPrice ? Number(p.ownPrice).toLocaleString("ru-RU") + " ₽" : "не указана"}
**Цена за кв.м**: ${p.pricePerSqm ? Number(p.pricePerSqm).toLocaleString("ru-RU") + " ₽" : "не указана"}
**Аренда**: ${p.rentMonth ? Number(p.rentMonth).toLocaleString("ru-RU") + " ₽/мес" : "не указана"}
**Аренда за кв.м**: ${p.rentPerSqm ? Number(p.rentPerSqm).toLocaleString("ru-RU") + " ₽/кв.м" : "не указана"}
**Индексация**: ${p.rentIndexPct ? `${p.rentIndexPct}% в год` : "не указана"}
**Коммуналка**: ${p.communal ? Number(p.communal).toLocaleString("ru-RU") + " ₽/мес" : "не указана"}
**Налог**: ${p.tax ? Number(p.tax).toLocaleString("ru-RU") + " ₽/год" : "не указан"}
**Управление**: ${p.management ? Number(p.management).toLocaleString("ru-RU") + " ₽/мес" : "не указано"}
**Расчётные показатели**: ${yields || "недостаточно данных"}

### Арендаторы
${tenantInfo}

### Заметки
${p.notes || "нет"}

---

**Вопрос пользователя**: ${userQuestion}`;
}
```

### Системный промпт для анализа портфеля

```typescript
function buildPortfolioSystemPrompt(): string {
  return `Ты — эксперт по инвестиционному портфелю коммерческой недвижимости в России.
Анализируй портфель объектов: диверсификацию, доходность, риски, рекомендации по оптимизации.
Ориентиры рынка РФ: доходность 8–12%, нормальный срок окупаемости 8–12 лет.
Отвечай на русском языке в формате Markdown.`;
}

function buildPortfolioUserMessage(
  properties: Array<RentierProperty & { tenants: RentierTenant[] }>,
  userQuestion: string
): string {
  const summary = properties.map(p =>
    `- **${p.title}** (${p.type}, ${p.status}): ` +
    `${p.area ? p.area + " кв.м, " : ""}` +
    `${p.ownPrice ? Number(p.ownPrice).toLocaleString("ru-RU") + " ₽, " : ""}` +
    `${p.netYield ? "доходность " + p.netYield + "%, " : ""}` +
    `арендаторов: ${p.tenants.length}`
  ).join("\n");

  return `## Портфель недвижимости (${properties.length} объектов)\n\n${summary}\n\n**Вопрос**: ${userQuestion}`;
}
```

---

## Структура страниц и компонентов

```
app/(app)/rentier/                          ← режим Рантье (новые страницы)
├── page.tsx                                ← список объектов (дашборд режима)
├── new/
│   └── page.tsx                           ← форма добавления объекта
├── [id]/
│   ├── page.tsx                           ← карточка объекта (детали)
│   └── edit/
│       └── page.tsx                       ← редактирование объекта
└── portfolio/
    └── page.tsx                           ← сводка по портфелю + AI портфеля

components/app/rentier/
├── PropertyCard.tsx                        ← карточка объекта в списке
├── PropertyForm.tsx                        ← форма добавления/редактирования
├── PropertyDetail.tsx                      ← полная карточка объекта
├── TenantsSection.tsx                      ← секция арендаторов
├── TenantForm.tsx                          ← форма добавления арендатора
├── EconomicsSection.tsx                    ← секция экономики с расчётами
├── YieldBadge.tsx                          ← бейдж доходности
├── AIChat.tsx                              ← чат с ИИ (история + ввод)
├── AIChatMessage.tsx                       ← одно сообщение (markdown)
└── PortfolioSummary.tsx                    ← сводка портфеля
```

---

## Навигация

### Вкладки режима (уже есть в UI — «Личное», «Рантье», «Бизнес»)

При переходе на вкладку «Рантье» → редирект на `/rentier`.

### Sidebar и BottomBar

В режиме Рантье в сайдбаре показывать подменю:
```
🏠  Объекты         /rentier
📊  Портфель        /rentier/portfolio
+ Добавить объект   /rentier/new
```

Реализовать через контекст текущего режима или через `pathname.startsWith("/rentier")`.

---

## UI: Список объектов (`/rentier`)

### Верхняя панель
- Заголовок «Рантье»
- Кнопка «+ Добавить объект» → `/rentier/new`
- Фильтры: по статусу (Все / Слежу / Переговоры / Куплено / Отклонено) + по типу
- Счётчик найденных объектов

### Карточка объекта (`PropertyCard`)
```
┌─────────────────────────────────────────────┐
│  🏪 Стрит-ритейл           [СЛЕЖУ]         │
│  ТЦ "Метрополис", ул. Ленина 15, Москва     │
│                                             │
│  📐 120 кв.м  ·  🏢 1/5 эт  ·  🚇 5 мин  │
│                                             │
│  💰 15 000 000 ₽     📈 9.2% чист.         │
│  💵 115 000 ₽/мес    🔄 12.2 лет          │
│                                             │
│  👥 2 арендатора                           │
│                          [Открыть]  [ИИ]   │
└─────────────────────────────────────────────┘
```

Если нет ключевых данных — показывать «—» вместо пустых полей.
Бейдж доходности:
- ≥ 10% → зелёный
- 7–10% → синий
- 5–7%  → жёлтый
- < 5%  → красный

---

## UI: Форма добавления/редактирования объекта

Форма разбита на **табы / секции** (не одна длинная страница):

### Секция 1: Основное
- Тип объекта (Select с иконками)
- Статус (Select: Слежу / Переговоры / Куплено / Отклонён)
- Название / короткий адрес (обязательное поле)
- Ссылка на объявление (ЦИАН, Авито и т.д.)
- Заметки (textarea)

### Секция 2: География
- Город
- Район / округ
- Полный адрес
- Ближайшее метро + минут пешком
- Этаж / всего этажей
- Год постройки

### Секция 3: Параметры
- Площадь, кв.м
- Высота потолков, м
- Вход (Улица / Двор / Общий)
- Состояние (Черновая / Косметика / Хорошее / Отличное)

### Секция 4: Экономика
**Цена:**
- Цена продавца, ₽
- Своя оценка / цена покупки, ₽
- Цена за кв.м (автовычисляется: ownPrice / area, можно переписать вручную)

**Аренда:**
- Текущая/планируемая аренда в месяц, ₽
- Аренда за кв.м (автовычисляется)
- Индексация аренды, % в год

**Расходы:**
- Коммуналка в месяц, ₽
- Налог на имущество в год, ₽
- Управляющая компания в месяц, ₽
- Прочие расходы в месяц, ₽

**Расчётные показатели (автоматически, read-only блок):**
```
Валовая доходность:  9.2%   Чистая доходность: 7.8%   Окупаемость: 12.8 лет
```
Пересчитываются при изменении любого поля в реальном времени (debounce 300ms).

### Секция 5: Арендаторы

**Переключатель:**
```
○ Есть арендаторы  ○ Арендаторов нет
```

**Если есть арендаторы** → список форм арендаторов (аккордеон):
Каждый арендатор:
- Название / бренд (обязательное)
- Категория (еда, медицина, банк, аптека, другое — free input)
- Площадь, кв.м
- Аренда в месяц, ₽
- Дата начала / конца договора
- Депозит, ₽
- Заметки
- Кнопка удалить арендатора

Кнопка «+ Добавить арендатора».

**Если нет арендаторов:**
- Текстовое поле «Планы по объекту» (кто планируется, сроки)
- Поле «Вакантен месяцев» (число)

### Кнопки формы
- «Сохранить» (POST/PATCH)
- «Отмена»
- При редактировании: «Удалить объект» (с подтверждением)

---

## UI: Карточка объекта (`/rentier/[id]`)

### Шапка
- Тип + эмодзи + название
- Бейдж статуса
- Кнопки: «Редактировать» | «Спросить ИИ»

### Блок: Ключевые метрики (4 карточки)
```
💰 15 000 000 ₽    📐 120 кв.м    📈 9.2%        🔄 12.8 лет
Цена               Площадь        Чистая доходн. Окупаемость
```

### Блок: Экономика
Таблица со всеми введёнными данными (доходы, расходы, итоги).

### Блок: Арендаторы
Если есть — список карточек арендаторов с деталями и сроком договора.
Если нет — планы + дата вакантности.
Кнопка «+ Добавить арендатора».

### Блок: Детали объекта
Местоположение, параметры, состояние.

### Блок: ИИ-анализ
Секция в нижней части страницы (или отдельный таб).

---

## UI: ИИ-чат (`AIChat.tsx`)

### Дизайн: простой чат

```
┌──────────────────────────────────────────────────────┐
│  🤖 ИИ-анализ объекта                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [Предыдущие анализы — collapse по умолчанию]        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Быстрые вопросы:                            │   │
│  │  [Оцени объект в целом]  [Риски]             │   │
│  │  [Сравни с рынком]       [Что улучшить]      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────┐ [→]   │
│  │ Напишите вопрос об объекте...            │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

### Быстрые вопросы (кнопки)
Для объекта:
- «Оцени инвестиционную привлекательность»
- «Какие риски у этого объекта?»
- «Доходность выше или ниже рынка?»
- «Что можно улучшить в экономике?»
- «Проверь арендаторов: есть ли риски?»

Для портфеля:
- «Оцени диверсификацию портфеля»
- «Какой объект самый выгодный?»
- «Где наибольшие риски?»
- «Советы по развитию портфеля»

### Поведение
1. Пользователь вводит вопрос (или нажимает быструю кнопку)
2. Показывать индикатор загрузки («ИИ думает…» с пульсирующей точкой)
3. Ответ приходит → отображать как Markdown (использовать `react-markdown` или аналог)
4. Сохранить в `RentierAIAnalysis`
5. История: последние 5 анализов — показывать свёрнуто (дата + первые 80 символов вопроса)

### Обработка ошибок
Если kie.ai недоступен или вернул ошибку → показать toast «ИИ временно недоступен. Попробуй позже.»

---

## UI: Портфель (`/rentier/portfolio`)

### Сводная статистика (карточки)
```
📦 Объектов     💰 Инвестировано    📈 Средн. доходность   👥 Арендаторов
    12               45 000 000 ₽         8.4% чист.             18
```

### Разбивка по типам (бар-чарт или список с прогресс-барами)
### Разбивка по статусам (пирог или список)
### Топ объектов по доходности (таблица, 5 строк)
### ИИ-анализ портфеля (тот же `AIChat` но без `propertyId`)

---

## Роутинг и доступ

Все `/api/rentier/*` и страницы `/rentier/*` защищены:
- `getUserIdOrUnauthorized()` в API
- `requireActiveSubscription()` в серверных компонентах страниц

Добавить `/rentier` в массив `PROTECTED_PREFIXES` в `middleware.ts`.

---

## Чеклист реализации

### База данных
- [ ] Добавить модели `RentierProperty`, `RentierTenant`, `RentierImage`, `RentierAIAnalysis` в `schema.prisma`
- [ ] Добавить отношение `rentierProperties RentierProperty[]` в модель `User`
- [ ] `npx prisma migrate dev --name add_rentier`

### Переменные окружения
- [ ] Добавить `KIE_API_TOKEN` и `KIE_API_BASE` в `.env.local`
- [ ] Добавить `KIE_API_TOKEN` в переменные окружения Amvera
- [ ] `.env.example` обновить (без реального токена)

### Backend
- [ ] `lib/kieai.ts` — клиент kie.ai
- [ ] `lib/rentier.ts` — утилиты: `calcYields`, `buildPropertyContext`, `buildPortfolioContext`
- [ ] `app/api/rentier/properties/route.ts` — GET (список) + POST (создать)
- [ ] `app/api/rentier/properties/[id]/route.ts` — GET + PATCH + DELETE
- [ ] `app/api/rentier/properties/[id]/tenants/route.ts` — POST
- [ ] `app/api/rentier/properties/[id]/tenants/[tenantId]/route.ts` — PATCH + DELETE
- [ ] `app/api/rentier/ai/route.ts` — POST (запрос к ИИ) + GET (история)
- [ ] `app/api/rentier/portfolio/route.ts` — GET (агрегат)

### Frontend — страницы
- [ ] `app/(app)/rentier/page.tsx` — список объектов
- [ ] `app/(app)/rentier/new/page.tsx` — форма добавления
- [ ] `app/(app)/rentier/[id]/page.tsx` — карточка объекта
- [ ] `app/(app)/rentier/[id]/edit/page.tsx` — редактирование
- [ ] `app/(app)/rentier/portfolio/page.tsx` — портфель

### Frontend — компоненты
- [ ] `PropertyCard.tsx`
- [ ] `PropertyForm.tsx` (с авторасчётом yields в реальном времени)
- [ ] `PropertyDetail.tsx`
- [ ] `TenantsSection.tsx` + `TenantForm.tsx`
- [ ] `EconomicsSection.tsx`
- [ ] `YieldBadge.tsx`
- [ ] `AIChat.tsx` + `AIChatMessage.tsx` (Markdown рендер)
- [ ] `PortfolioSummary.tsx`

### Навигация
- [ ] Обновить логику вкладки «Рантье» → редирект на `/rentier`
- [ ] Добавить подменю в Sidebar при `pathname.startsWith("/rentier")`
- [ ] Добавить `/rentier` в `PROTECTED_PREFIXES`

---

## Важные замечания

1. **Токен kie.ai** — хранить только в `process.env.KIE_API_TOKEN`. Никогда не в клиентском коде и не в репозитории.

2. **Парсинг ответа kie.ai** — при первом запросе проверить реальный формат ответа. Если API возвращает OpenAI-совместимый формат (`choices[0].message.content`) — использовать его. Если Anthropic-нативный (`content[0].text`) — адаптировать.

3. **react-markdown** — если ещё не установлен, добавить: `npm install react-markdown`. Для рендера AI-ответов.

4. **Изображения** — в первой версии хранить URL (ссылки на ЦИАН/Авито). Загрузку файлов не реализовывать.

5. **Валюта** — все суммы в рублях. Использовать существующую `formatMoney(value, "RUB")` из `lib/utils.ts`.

6. **Мобильная адаптация** — форма объекта на мобиле: секции в виде аккордеона, не табов. Список объектов — карточки в одну колонку.

7. **Расчёт yields** — производить на сервере при PATCH/POST и сохранять в БД. На клиенте — предварительный real-time расчёт в форме (без запроса к серверу), только для отображения пользователю.

8. **Пустой список** — если у пользователя нет объектов, показать Empty State с призывом добавить первый объект и кратким описанием возможностей режима.