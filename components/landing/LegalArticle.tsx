import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalArticle({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        На главную
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
        {title}
      </h1>
      <p className="text-sm text-text-muted mb-8">
        Дата последнего обновления: {updated}
      </p>

      <div className="legal-content text-text leading-relaxed">{children}</div>
    </article>
  );
}
