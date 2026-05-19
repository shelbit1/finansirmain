# context.md — Техническое задание: «Финансыр»

> Платформа для личного учёта финансов. Современный, удобный, адаптивный интерфейс.

---

## 1. Общее описание

**Финансыр** — веб-приложение для ведения личного учёта финансов. Пользователь сам создаёт счета, статьи доходов и расходов, фиксирует операции трёх типов (доход, расход, перемещение), ведёт учёт долгов и портфель личных активов.

**Целевая аудитория:** физические лица, ведущие личный бюджет.

---

## 2. Технический стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 14+ (App Router) |
| Язык | TypeScript |
| Стили | Tailwind CSS + CSS Variables |
| База данных | Yandex Managed Service for PostgreSQL |
| ORM | Prisma |
| Аутентификация | NextAuth.js (email/password + OAuth по желанию) |
| Деплой | Vercel / собственный сервер |
| Адаптивность | Mobile-first, breakpoints: 375px / 768px / 1280px |

---

## 3. Дизайн-система

### Палитра
```css
/* Основные цвета */
--color-bg:         #F7F8FA;   /* фон приложения */
--color-surface:    #FFFFFF;   /* карточки, панели */
--color-border:     #E8ECF0;   /* разделители */

/* Акценты */
--color-primary:    #3D7EFF;   /* кнопки, ссылки */
--color-primary-dk: #2B65D9;   /* hover */

/* Семантические */
--color-income:     #22C55E;   /* зелёный — доходы */
--color-expense:    #EF4444;   /* красный — расходы */
--color-transfer:   #8B5CF6;   /* фиолетовый — перемещения */
--color-debt-owe:   #F97316;   /* оранжевый — я должен */
--color-debt-get:   #06B6D4;   /* голубой — должны мне */
--color-asset:      #EAB308;   /* янтарный — активы */

/* Текст */
--color-text:       #1A1D23;
--color-text-muted: #6B7280;
```

### Типографика
- Заголовки: `Geist` или `Plus Jakarta Sans`
- Тело: `Inter`
- Цифры: `tabular-nums` (моноширинные)
- Базовый размер: 16px

### Принципы UI
- Минимализм без потери функциональности
- Карточки с мягкой тенью (`box-shadow: 0 1px 4px rgba(0,0,0,0.08)`)
- Скруглённые углы: `border-radius: 12px` для карточек, `8px` для кнопок
- Анимации: плавные переходы 150–200 мс
- Иконки: `lucide-react`

---

## 4. Структура БД (Prisma schema)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  createdAt DateTime @default(now())

  accounts          Account[]
  incomeCategories  IncomeCategory[]
  expenseCategories ExpenseCategory[]
  transactions      Transaction[]
  dailyCheckIns     DailyCheckIn[]
  debts             Debt[]
  assets            Asset[]
  assetValueHistory AssetValueHistory[]
}

// Счёт (кошелёк, карта, наличные и т.д.)
model Account {
  id        String   @id @default(cuid())
  userId    String
  name      String               // «Наличные», «Тинькофф», «Сбер»
  currency  String  @default("RUB")
  balance   Decimal @default(0)
  icon      String?              // emoji или slug иконки
  color     String?              // hex-цвет для визуализации
  createdAt DateTime @default(now())

  user              User          @relation(fields: [userId], references: [id])
  transactionsFrom  Transaction[] @relation("FromAccount")
  transactionsTo    Transaction[] @relation("ToAccount")
}

// Статья доходов (зарплата, фриланс, дивиденды...)
model IncomeCategory {
  id        String   @id @default(cuid())
  userId    String
  name      String
  icon      String?
  color     String?
  createdAt DateTime @default(now())

  user         User          @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

// Статья расходов (еда, транспорт, развлечения...)
model ExpenseCategory {
  id        String   @id @default(cuid())
  userId    String
  name      String
  icon      String?
  color     String?
  createdAt DateTime @default(now())

  user         User          @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

// Транзакция (доход / расход / перемещение)
model Transaction {
  id                String          @id @default(cuid())
  userId            String
  type              TransactionType  // INCOME | EXPENSE | TRANSFER
  amount            Decimal
  date              DateTime
  note              String?

  // Для INCOME
  incomeCategoryId  String?
  incomeCategory    IncomeCategory? @relation(fields: [incomeCategoryId], references: [id])
  toAccountId       String?         // счёт зачисления (INCOME / TRANSFER)
  toAccount         Account?        @relation("ToAccount", fields: [toAccountId], references: [id])

  // Для EXPENSE
  expenseCategoryId String?
  expenseCategory   ExpenseCategory? @relation(fields: [expenseCategoryId], references: [id])
  fromAccountId     String?          // счёт списания (EXPENSE / TRANSFER)
  fromAccount       Account?         @relation("FromAccount", fields: [fromAccountId], references: [id])

  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

// Отметка «прочитал памятку сегодня»
model DailyCheckIn {
  id        String   @id @default(cuid())
  userId    String
  date      String   // формат "YYYY-MM-DD"
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, date])
}

// ─── ДОЛГИ ──────────────────────────────────────────────────────────────────

// Долг (я должен / должны мне)
model Debt {
  id          String     @id @default(cuid())
  userId      String
  direction   DebtDirection   // I_OWE (я должен) | OWED_TO_ME (мне должны)
  personName  String          // имя человека
  amount      Decimal         // изначальная сумма долга
  currency    String  @default("RUB")
  dueDate     DateTime?       // срок возврата (необязательно)
  description String?         // описание / комментарий
  status      DebtStatus @default(ACTIVE)  // ACTIVE | PARTIALLY_PAID | CLOSED
  paidAmount  Decimal @default(0)          // сколько уже выплачено/получено
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  payments DebtPayment[]
}

// Частичные платежи по долгу
model DebtPayment {
  id        String   @id @default(cuid())
  debtId    String
  amount    Decimal
  date      DateTime
  note      String?
  createdAt DateTime @default(now())

  debt Debt @relation(fields: [debtId], references: [id], onDelete: Cascade)
}

enum DebtDirection {
  I_OWE      // я должен кому-то
  OWED_TO_ME // кто-то должен мне
}

enum DebtStatus {
  ACTIVE         // активный
  PARTIALLY_PAID // частично выплачен
  CLOSED         // закрыт / погашен
}

// ─── АКТИВЫ ─────────────────────────────────────────────────────────────────

// Актив (недвижимость, авто, акции, крипта, депозит и т.д.)
model Asset {
  id               String      @id @default(cuid())
  userId           String
  name             String           // «Квартира на Ленина», «Tesla акции», «BTC»
  type             AssetType        // тип актива
  purchasePrice    Decimal          // цена покупки / себестоимость
  currentValue     Decimal          // текущая рыночная стоимость
  currency         String  @default("RUB")
  purchaseDate     DateTime?        // дата приобретения
  quantity         Decimal? @default(1)  // количество (для акций, крипты)
  unit             String?          // «шт», «BTC», «м²»
  description      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user         User                @relation(fields: [userId], references: [id])
  valueHistory AssetValueHistory[]
}

// История изменения стоимости актива
model AssetValueHistory {
  id        String   @id @default(cuid())
  assetId   String
  userId    String
  value     Decimal       // рыночная стоимость на дату
  date      DateTime      // дата фиксации стоимости
  note      String?
  createdAt DateTime @default(now())

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])
}

enum AssetType {
  REAL_ESTATE   // недвижимость
  VEHICLE       // транспорт
  STOCKS        // акции / фонды
  CRYPTO        // криптовалюта
  DEPOSIT       // вклад / депозит
  BUSINESS      // доля в бизнесе
  PRECIOUS      // драгметаллы / ювелирка
  OTHER         // прочее
}
```

---

## 5. Архитектура Next.js (App Router)

```
/app
  /(landing)
    page.tsx               ← Лендинг (публичная страница)

  /(auth)
    login/page.tsx         ← Вход
    register/page.tsx      ← Регистрация

  /(app)
    layout.tsx             ← Обёртка: проверка сессии + ежедневная памятка
    dashboard/page.tsx     ← Главный дашборд
    transactions/page.tsx  ← Список всех операций
    accounts/page.tsx      ← Управление счетами
    categories/page.tsx    ← Управление статьями
    debts/page.tsx         ← Долги (я должен / должны мне)
    assets/page.tsx        ← Активы и портфель
    settings/page.tsx      ← Настройки профиля

/components
  landing/
    Hero.tsx
    Features.tsx
    CTA.tsx
  app/
    DailyMemoModal.tsx     ← Ежедневная памятка
    Sidebar.tsx
    TransactionForm.tsx
    AccountCard.tsx
    CategoryManager.tsx
    BalanceSummary.tsx
    TransactionList.tsx
    debts/
      DebtCard.tsx           ← Карточка долга (статус, прогресс-бар)
      DebtForm.tsx           ← Форма создания/редактирования долга
      DebtPaymentModal.tsx   ← Модал фиксации платежа
      DebtSummary.tsx        ← Сводка: итого должен / итого должны
    assets/
      AssetCard.tsx          ← Карточка актива (стоимость, прирост)
      AssetForm.tsx          ← Форма создания/редактирования актива
      AssetValueModal.tsx    ← Модал обновления рыночной стоимости
      AssetPortfolioSummary.tsx ← Общая стоимость портфеля
      AssetChart.tsx         ← График динамики стоимости актива
    charts/
      IncomeExpenseChart.tsx
      CategoryPieChart.tsx

/lib
  db.ts                    ← Prisma client singleton
  auth.ts                  ← NextAuth config
  utils.ts                 ← Форматирование чисел, дат

/api
  auth/[...nextauth]/
  transactions/
  accounts/
  categories/income/
  categories/expense/
  debts/
  debts/[id]/payments/
  assets/
  assets/[id]/values/
  daily-checkin/
```

---

## 6. Страницы и экраны

### 6.1 Лендинг `/`
- Навбар: логотип «Финансыр» + кнопки «Войти» / «Попробовать бесплатно»
- Hero-секция: заголовок, подзаголовок, CTA-кнопка «Начать бесплатно»
- Блок «Возможности»: 3–4 карточки фич (доходы, расходы, счета, аналитика)
- Footer: копирайт

### 6.2 Ежедневная памятка (модальное окно)
**Триггер:** первый вход пользователя за текущий день (проверка по `DailyCheckIn`).

Контент памятки (7 пунктов, отображать как нумерованный список с акцентом):
```
1. Золото растёт в руках тех, кто откладывает десятую часть доходов
2. Золото работает, когда владелец продолжает заниматься доходными делами
3. Золото не уходит от благоразумных хозяев
4. Золото уходит, когда его вкладывают в малознакомое дело
5. Золото уходит от тех, кто верит в удачу без усилий
6. Не вкладываться в темки и хайп
7. Не стоит лезть во все подряд, лучше светить, как луч, не быть лампочкой
```

UI:
- Фоновый оверлей (backdrop-blur)
- Заголовок: «Напоминание дня 📜»
- Список пунктов с иконками ✦
- Чекбокс: «Я прочитал(а) и принимаю эти правила»
- Кнопка «Продолжить» — активна только после отметки чекбокса
- При нажатии: POST `/api/daily-checkin` → сохранить дату → закрыть модал

### 6.3 Дашборд `/dashboard`
- Верхняя строка: итоговый баланс всех счетов
- Три плитки: «Доходы за месяц», «Расходы за месяц», «Чистый результат»
- Две плитки: «Я должен» (сумма активных долгов), «Мне должны»
- Плитка «Стоимость активов» с приростом относительно себестоимости
- График доходов/расходов по дням (bar chart или line)
- Последние 5 операций (быстрый доступ)
- Кнопка «+ Добавить операцию» (floating или в хедере)

### 6.4 Операции `/transactions`
- Фильтры: тип (доход/расход/перемещение), счёт, категория, период
- Список операций с пагинацией или infinite scroll
- Форма добавления (drawer или modal):
  - Тип операции (3 таба)
  - Сумма
  - Дата
  - Счёт / Счёт списания + зачисления
  - Категория
  - Заметка (необязательно)

### 6.5 Счета `/accounts`
- Сетка карточек счетов: название, баланс, иконка, цвет
- Кнопка «+ Добавить счёт»
- Форма создания: название, валюта, начальный баланс, иконка, цвет
- Редактирование и удаление (с предупреждением, если есть операции)

### 6.6 Категории `/categories`
- Два таба: «Доходы» / «Расходы»
- Список категорий с иконкой и цветом
- Кнопка «+ Добавить категорию»
- Инлайн-редактирование, удаление

### 6.7 Долги `/debts`

**Концепция:** два потока в одном экране — «Я должен» и «Мне должны». Визуально разделены цветом (оранжевый vs голубой).

**Верхняя сводка:**
- Плитка «Я должен» — суммарная сумма активных долгов (оранжевая)
- Плитка «Мне должны» — суммарная сумма к получению (голубая)
- Плитка «Чистый баланс» — разница (положительный = в плюсе)

**Список долгов:**
- Таб-переключатель: «Все» / «Я должен» / «Мне должны» / «Закрытые»
- Карточка долга:
  - Имя человека + иконка-аватар (инициалы)
  - Сумма долга и остаток
  - Прогресс-бар погашения (если были частичные платежи)
  - Срок возврата (с подсветкой красным, если просрочен)
  - Статус: `ACTIVE` / `PARTIALLY_PAID` / `CLOSED`
  - Кнопки: «Отметить платёж», «Редактировать», «Закрыть долг»

**Форма создания долга:**
- Направление: «Я должен» / «Мне должны» (большие радио-кнопки)
- Имя человека
- Сумма и валюта
- Срок возврата (необязательно)
- Описание (необязательно)

**Модал «Отметить платёж»:**
- Сумма платежа
- Дата платежа
- Заметка
- При полном погашении → статус автоматически → `CLOSED`

**История платежей** по долгу — разворачивается внутри карточки (аккордеон)

---

### 6.8 Активы `/assets`

**Концепция:** личный портфель активов с отслеживанием изменения стоимости во времени.

**Верхняя сводка:**
- Общая стоимость портфеля (сумма `currentValue` всех активов)
- Общая себестоимость (сумма `purchasePrice`)
- Прирост в рублях и процентах (с иконкой ↑↓ и цветом)

**Список активов:**
- Фильтр по типу (Недвижимость / Авто / Акции / Крипта / Депозит / Бизнес / Металлы / Прочее)
- Карточка актива:
  - Иконка типа (эмодзи или lucide-иконка)
  - Название актива
  - Текущая стоимость (крупно)
  - Себестоимость → прирост (сумма + %) с зелёным/красным цветом
  - Дата последнего обновления стоимости
  - Кнопка «Обновить стоимость»

**Форма создания актива:**
- Тип актива (выбор из enum с иконками)
- Название
- Цена покупки + дата
- Текущая рыночная стоимость
- Количество + единица измерения (для акций, крипты, м²)
- Валюта
- Описание

**Модал «Обновить стоимость»:**
- Новая рыночная стоимость
- Дата фиксации (по умолчанию сегодня)
- Заметка (откуда цена: брокер, оценщик, сайт)
- После сохранения → обновляет `currentValue` + добавляет запись в `AssetValueHistory`

**График динамики стоимости** (разворачивается внутри карточки):
- Line chart по датам из `AssetValueHistory`
- Горизонтальная линия себестоимости для наглядности

---

### 6.9 Настройки `/settings`
- Имя пользователя, email
- Смена пароля
- Удаление аккаунта

---

## 7. API Routes

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/accounts` | Список счетов пользователя |
| POST | `/api/accounts` | Создать счёт |
| PATCH | `/api/accounts/:id` | Редактировать счёт |
| DELETE | `/api/accounts/:id` | Удалить счёт |
| GET | `/api/categories/income` | Статьи доходов |
| POST | `/api/categories/income` | Создать статью дохода |
| PATCH | `/api/categories/income/:id` | Редактировать |
| DELETE | `/api/categories/income/:id` | Удалить |
| GET | `/api/categories/expense` | Статьи расходов |
| POST | `/api/categories/expense` | Создать статью расхода |
| PATCH | `/api/categories/expense/:id` | Редактировать |
| DELETE | `/api/categories/expense/:id` | Удалить |
| GET | `/api/transactions` | Список операций (с фильтрами) |
| POST | `/api/transactions` | Создать операцию |
| PATCH | `/api/transactions/:id` | Редактировать операцию |
| DELETE | `/api/transactions/:id` | Удалить операцию |
| POST | `/api/daily-checkin` | Отметить памятку прочитанной сегодня |
| GET | `/api/daily-checkin/today` | Проверить: читал ли пользователь памятку сегодня |
| GET | `/api/debts` | Список долгов (фильтр по direction, status) |
| POST | `/api/debts` | Создать долг |
| PATCH | `/api/debts/:id` | Редактировать долг |
| DELETE | `/api/debts/:id` | Удалить долг |
| POST | `/api/debts/:id/payments` | Зафиксировать платёж по долгу |
| DELETE | `/api/debts/:id/payments/:pid` | Удалить платёж |
| GET | `/api/assets` | Список активов (фильтр по type) |
| POST | `/api/assets` | Создать актив |
| PATCH | `/api/assets/:id` | Редактировать актив |
| DELETE | `/api/assets/:id` | Удалить актив |
| GET | `/api/assets/:id/values` | История стоимости актива |
| POST | `/api/assets/:id/values` | Добавить обновление стоимости |
| DELETE | `/api/assets/:id/values/:vid` | Удалить запись истории |

---

## 8. Бизнес-логика

### Баланс счёта
- Рассчитывается автоматически при добавлении / изменении / удалении операции
- **Доход:** `toAccount.balance += amount`
- **Расход:** `fromAccount.balance -= amount`
- **Перемещение:** `fromAccount.balance -= amount`, `toAccount.balance += amount`
- Транзакция обновления баланса выполняется атомарно (Prisma `$transaction`)

### Ежедневная памятка
- Проверяется в `layout.tsx` через `getServerSession` или клиентский хук
- Если `DailyCheckIn` для `userId + today` не найдена → показать модал
- Закрытие без отметки — невозможно (нет крестика, нет клика вне модала)

### Долги: автоматический статус
- При создании долга → `status: ACTIVE`, `paidAmount: 0`
- При фиксации платежа → `paidAmount += payment.amount`
  - Если `paidAmount >= amount` → `status: CLOSED`
  - Если `0 < paidAmount < amount` → `status: PARTIALLY_PAID`
- При удалении платежа → пересчёт `paidAmount` и статуса
- Просроченный долг = `status: ACTIVE` && `dueDate < today` → подсветка UI, но статус не меняется автоматически

### Активы: обновление стоимости
- При создании актива → первая запись в `AssetValueHistory` с `value = currentValue` и `date = purchaseDate ?? today`
- При сохранении через модал «Обновить стоимость» → `asset.currentValue = newValue` + новая запись в `AssetValueHistory`
- При удалении записи истории → `currentValue` обновляется до последней оставшейся записи
- Прирост = `(currentValue - purchasePrice) / purchasePrice * 100` (%)
- Общая стоимость портфеля = `SUM(currentValue)` по всем активам пользователя

---

## 9. Адаптивность

| Устройство | Поведение |
|---|---|
| Мобильный (< 768px) | Боковое меню → нижняя навбар (tab bar). Карточки — в колонку. Формы — full-screen drawer |
| Планшет (768–1279px) | Боковое меню сворачивается в иконки. Сетка 2 колонки |
| Десктоп (≥ 1280px) | Полное боковое меню. Сетка 3–4 колонки |

**Обязательно:** все touch-targets ≥ 44px. Формы удобны для ввода с клавиатуры мобильного (`inputMode="decimal"` для сумм, `type="date"` для дат).

---

## 10. Безопасность

- Все API-роуты защищены проверкой сессии (`getServerSession`)
- Все запросы к БД фильтруются по `userId` из сессии (никакого IDOR)
- Пароли хэшируются через `bcryptjs`
- CSRF-защита: встроена в NextAuth
- Переменные окружения для подключения к БД не попадают в клиентский бандл

---

## 11. Переменные окружения (`.env`)

```env
# Yandex Managed PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6432/DB_NAME?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"
```

---

## 12. Порядок разработки (рекомендуемый)

1. Инициализация Next.js + TypeScript + Tailwind
2. Prisma schema + миграции + подключение к Yandex PostgreSQL
3. NextAuth: регистрация и вход по email/паролю
4. Лендинг (публичная страница)
5. Layout приложения: сайдбар, нижний таббар (мобайл)
6. Ежедневная памятка (модал + API)
7. Счета: CRUD
8. Категории: CRUD (доходы + расходы)
9. Операции: форма + список + фильтры
10. Долги: CRUD + платежи + прогресс статус
11. Активы: CRUD + история стоимости + графики
12. Дашборд: сводка + графики + виджеты долгов и активов
13. Настройки профиля
14. Финальная полировка адаптивности и анимаций

---

## 13. Ключевые UX-принципы

- **Zero-friction onboarding:** при первой регистрации автоматически создаётся счёт «Наличные» и базовые категории (можно редактировать)
- **Быстрое добавление:** кнопка `+` всегда видна на любом экране
- **Цветовое кодирование:** зелёный = доход, красный = расход, фиолетовый = перемещение — везде одинаково
- **Числа всегда чёткие:** форматирование `1 234 567,89 ₽` с пробелами-разделителями
- **Памятка — это ритуал,** а не барьер: красивое оформление, спокойные цвета, ощущение настроя на день
