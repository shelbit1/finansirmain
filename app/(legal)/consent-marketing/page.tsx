import type { Metadata } from "next";
import { LegalArticle } from "@/components/landing/LegalArticle";

export const metadata: Metadata = {
  title: "Согласие на рассылки — Финансыр",
  robots: "noindex",
};

const UPDATED = "19.05.2026";

export default function ConsentMarketingPage() {
  return (
    <LegalArticle title="Согласие на получение рассылок" updated={UPDATED}>
      <p>
        Настоящим я даю согласие{" "}
        <strong>ИП Набиеву Эльвину Шахлар Оглы</strong> (ИНН 531502263400) на
        направление мне на указанный при регистрации адрес электронной почты
        информационных и маркетинговых материалов о сервисе «Финансыр»: новости,
        обновления, специальные предложения.
      </p>

      <p>
        Согласие является добровольным. Я вправе отозвать его в любой момент,
        нажав «Отписаться» в любом письме или обратившись на{" "}
        <a href="mailto:e.nabiev1997@yandex.com">e.nabiev1997@yandex.com</a>.
      </p>
    </LegalArticle>
  );
}
