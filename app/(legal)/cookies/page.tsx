import type { Metadata } from "next";
import { LegalArticle } from "@/components/landing/LegalArticle";

export const metadata: Metadata = {
  title: "Политика Cookie — Финансыр",
  robots: "noindex",
};

const UPDATED = "19.05.2026";

export default function CookiesPage() {
  return (
    <LegalArticle title="Политика использования файлов Cookie" updated={UPDATED}>
      <h2>Что такое cookie</h2>
      <p>Небольшие текстовые файлы, сохраняемые браузером пользователя.</p>

      <h2>Какие cookie мы используем</h2>
      <table>
        <thead>
          <tr>
            <th>Тип</th>
            <th>Название</th>
            <th>Цель</th>
            <th>Срок</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Необходимые</td>
            <td>
              <code>session_token</code>
            </td>
            <td>Поддержание сессии пользователя</td>
            <td>До закрытия браузера / 30 дней</td>
          </tr>
          <tr>
            <td>Аналитические</td>
            <td>
              <code>_ym_uid</code>, <code>_ym_d</code>
            </td>
            <td>Яндекс.Метрика — анализ использования сайта</td>
            <td>1 год</td>
          </tr>
          <tr>
            <td>Аналитические</td>
            <td>
              <code>_ym_isad</code>
            </td>
            <td>Яндекс.Метрика — определение блокировщика рекламы</td>
            <td>1 день</td>
          </tr>
        </tbody>
      </table>

      <h2>Яндекс.Метрика</h2>
      <p>
        Сервис использует Яндекс.Метрику (ООО «Яндекс», Россия). Собранные
        данные обрабатываются в соответствии с политикой конфиденциальности
        Яндекса:{" "}
        <a
          href="https://yandex.ru/legal/confidential"
          target="_blank"
          rel="noopener noreferrer"
        >
          yandex.ru/legal/confidential
        </a>
        .
      </p>

      <h2>Управление cookie</h2>
      <p>
        Пользователь может отключить аналитические cookie через баннер при
        первом посещении сайта или в настройках браузера. Отключение необходимых
        cookie нарушит работу сервиса.
      </p>
    </LegalArticle>
  );
}
