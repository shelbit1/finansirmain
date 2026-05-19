import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/landing/CookieBanner";
import { YandexMetrika } from "@/components/landing/YandexMetrika";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Финансыр — личный учёт финансов",
  description:
    "Современная платформа для личного учёта финансов: счета, операции, долги и активы в одном месте.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        {children}
        <CookieBanner />
        <YandexMetrika />
      </body>
    </html>
  );
}
